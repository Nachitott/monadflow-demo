import { NextRequest, NextResponse } from 'next/server';
import {
  frozenAmount,
  listActivity,
  listAgreements,
  listSessions,
  listTransfers,
  stageAmount,
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
      kind: 'deposit',
      direction: 'in',
      amount: a.amount,
      currency: a.currency,
      at: a.createdAt,
      label: 'Carga de saldo',
      refId: a.id,
    });
  }

  items.sort((x, y) => y.at - x.at);
  return NextResponse.json(items.slice(0, 50));
}
