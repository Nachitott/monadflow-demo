import { NextRequest, NextResponse } from 'next/server';
import {
  frozenAmount,
  listActivity,
  listAgreements,
  listSessions,
  listTransfers,
  makeActivityId,
  saveActivity,
  stageAmount,
  type ActivityRecord,
} from '@/lib/server/store';
import type { Currency } from '@/lib/useExchangeRate';

export const dynamic = 'force-dynamic';

export type ActivityKind =
  | 'deposit'
  | 'transfer_sent'
  | 'transfer_received'
  | 'consumo'
  | 'escrow_deposit'
  | 'escrow_release'
  | 'escrow_payment'
  | 'escrow_refund';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  direction: 'in' | 'out';
  amount: number;
  currency: Currency;
  /** Unix ms of the money event. */
  at: number;
  /** Counterparty or context: alias, name, merchant, agreement title. */
  label: string;
  /** Id used for the receipt line / destination link (`Comprobante #id`). */
  refId: string;
}

/**
 * Unified movement feed. Derives entries from the domain stores
 * (idempotent — lazy mutations like auto-approve are captured for free)
 * and merges the explicit activity log for events that leave no trace
 * otherwise (fiat top-ups).
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user');
  if (!userId)
    return NextResponse.json({ error: 'missing_user' }, { status: 400 });

  const [transfers, sessions, agreements, activity] = await Promise.all([
    listTransfers(),
    listSessions(),
    listAgreements(),
    listActivity(),
  ]);

  const items: ActivityItem[] = [];

  for (const t of transfers) {
    if (t.from === userId)
      items.push({
        id: t.id,
        kind: 'transfer_sent',
        direction: 'out',
        amount: t.amount,
        currency: t.currency,
        at: t.createdAt,
        label: t.to,
        refId: t.id,
      });
    else if (t.toUserId === userId)
      items.push({
        id: `${t.id}-in`,
        kind: 'transfer_received',
        direction: 'in',
        amount: t.amount,
        currency: t.currency,
        at: t.createdAt,
        label: t.fromName,
        refId: t.id,
      });
  }

  for (const s of sessions) {
    if (s.userId === userId && s.ended && s.totalPaid != null)
      items.push({
        id: s.id,
        kind: 'consumo',
        direction: 'out',
        amount: s.totalPaid,
        currency: s.currency,
        at: s.endTime ?? s.startTime,
        label: s.merchantName,
        refId: s.id,
      });
  }

  for (const a of agreements) {
    const isClient = a.clientId === userId;
    const isContractor = a.contractorId === userId;
    if (!isClient && !isContractor) continue;

    if (isClient && a.status !== 'pending')
      items.push({
        id: `${a.id}-deposit`,
        kind: 'escrow_deposit',
        direction: 'out',
        amount: a.totalAmount,
        currency: a.currency,
        at: a.stages[0]?.authorizedAt ?? a.createdAt,
        label: a.title,
        refId: a.id,
      });

    a.stages.forEach((st, i) => {
      if (!st.paidAt) return;
      items.push({
        id: `${a.id}-s${i}`,
        kind: isClient ? 'escrow_release' : 'escrow_payment',
        direction: isClient ? 'out' : 'in',
        amount: stageAmount(a),
        currency: a.currency,
        at: st.paidAt,
        label: `Etapa ${i + 1} · ${a.title}`,
        refId: a.id,
      });
    });

    if (isClient && a.status === 'cancelled' && a.cancelledAt) {
      const refund = frozenAmount(a);
      if (refund > 0)
        items.push({
          id: `${a.id}-refund`,
          kind: 'escrow_refund',
          direction: 'in',
          amount: refund,
          currency: a.currency,
          at: a.cancelledAt,
          label: a.title,
          refId: a.id,
        });
    }
  }

  for (const a of activity) {
    if (a.userId !== userId) continue;
    items.push({
      id: a.id,
      kind: a.kind,
      direction: KIND_DIRECTION[a.kind] ?? 'in',
      amount: a.amount,
      currency: a.currency,
      at: a.createdAt,
      label: a.label ?? 'Carga de saldo',
      refId: a.refId ?? a.id,
    });
  }

  items.sort((x, y) => y.at - x.at);
  return NextResponse.json(items.slice(0, 50));
}

const KIND_DIRECTION: Record<ActivityKind, 'in' | 'out'> = {
  deposit: 'in',
  transfer_sent: 'out',
  transfer_received: 'in',
  consumo: 'out',
  escrow_deposit: 'out',
  escrow_release: 'out',
  escrow_payment: 'in',
  escrow_refund: 'in',
};

const ALLOWED_KINDS = new Set<ActivityKind>(Object.keys(KIND_DIRECTION) as ActivityKind[]);

/**
 * Records an explicit money event (chain-mode flows post here since
 * their state lives on-chain, not in the domain stores). `dedupeKey`
 * makes the write idempotent — sync-on-read reporters can fire freely.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? '').slice(0, 80);
  const kind = body.kind as ActivityKind;
  const amount = Number(body.amount);
  const currency: Currency = body.currency === 'USD' ? 'USD' : 'ARS';

  if (!userId) return NextResponse.json({ error: 'missing_user' }, { status: 400 });
  if (!ALLOWED_KINDS.has(kind))
    return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });

  const dedupeKey = typeof body.dedupeKey === 'string' ? body.dedupeKey.slice(0, 120) : undefined;
  if (dedupeKey) {
    const existing = await listActivity();
    if (existing.some((a) => a.userId === userId && a.dedupeKey === dedupeKey)) {
      return NextResponse.json({ deduped: true });
    }
  }

  const record: ActivityRecord = {
    id: makeActivityId(),
    userId,
    kind,
    amount,
    currency,
    label: String(body.label ?? '').slice(0, 80) || undefined,
    refId: String(body.refId ?? '').slice(0, 80) || undefined,
    dedupeKey,
    createdAt: Number.isFinite(Number(body.at)) ? Number(body.at) : Date.now(),
  };
  await saveActivity(record);
  return NextResponse.json(record, { status: 201 });
}
