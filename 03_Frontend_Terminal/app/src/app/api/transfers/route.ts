import { NextRequest, NextResponse } from 'next/server';
import {
  applyBalanceDelta,
  getAlias,
  getBalances,
  listTransfers,
  makeTransferId,
  saveTransfer,
  type TransferRecord,
} from '@/lib/server/store';
import type { Currency } from '@/lib/useExchangeRate';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get('user');
  const transfers = await listTransfers();
  const mine = user
    ? transfers.filter((t) => t.from === user || t.toUserId === user)
    : transfers;
  return NextResponse.json(
    mine.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50),
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const fromUserId = String(body.fromUserId ?? '').slice(0, 80);
  const fromName = String(body.fromName ?? '').slice(0, 60) || 'Usuario';
  const toAlias = String(body.toAlias ?? '').trim().toLowerCase().slice(0, 30);
  const amount = Number(body.amount);
  const currency: Currency = body.currency === 'USD' ? 'USD' : 'ARS';
  const note = String(body.note ?? '').slice(0, 120) || undefined;

  if (!fromUserId) return NextResponse.json({ error: 'missing_user' }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
  }

  const recipient = await getAlias(toAlias);
  if (!recipient) {
    return NextResponse.json({ error: 'alias_not_found' }, { status: 404 });
  }
  if (recipient.userId === fromUserId) {
    return NextResponse.json({ error: 'self_transfer' }, { status: 400 });
  }

  const sender = (await getBalances(fromUserId)) ?? { ARS: 0, USD: 0 };
  if (sender[currency] < amount) {
    return NextResponse.json({ error: 'insufficient_funds' }, { status: 402 });
  }

  // Debit sender + credit recipient in the shared store, then record.
  await applyBalanceDelta(fromUserId, -amount, currency);
  await applyBalanceDelta(recipient.userId, amount, currency);

  const transfer: TransferRecord = {
    id: makeTransferId(),
    from: fromUserId,
    fromName,
    to: recipient.alias,
    toUserId: recipient.userId,
    amount,
    currency,
    note,
    status: 'completed',
    createdAt: Date.now(),
  };
  await saveTransfer(transfer);
  return NextResponse.json(transfer, { status: 201 });
}
