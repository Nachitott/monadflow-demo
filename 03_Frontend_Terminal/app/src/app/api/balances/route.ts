import { NextRequest, NextResponse } from 'next/server';
import {
  applyBalanceDelta,
  getBalances,
  makeActivityId,
  saveActivity,
  setBalances,
} from '@/lib/server/store';
import type { Currency } from '@/lib/useExchangeRate';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user');
  if (!userId) return NextResponse.json({ error: 'missing_user' }, { status: 400 });
  // null = no server record yet → client seeds it from its local cache.
  const balances = (await getBalances(userId)) ?? null;
  return NextResponse.json(balances);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? '').slice(0, 80);
  if (!userId) return NextResponse.json({ error: 'missing_user' }, { status: 400 });

  const currency: Currency = body.currency === 'USD' ? 'USD' : 'ARS';

  // One-time seed from the legacy localStorage balance — only when the
  // user has no server-side record yet.
  if (body.mode === 'seed') {
    const existing = await getBalances(userId);
    if (existing) return NextResponse.json(existing);
    const ars = Number(body.balances?.ARS);
    const usd = Number(body.balances?.USD);
    const seeded = {
      ARS: Number.isFinite(ars) && ars > 0 ? ars : 0,
      USD: Number.isFinite(usd) && usd > 0 ? usd : 0,
    };
    await setBalances(userId, seeded);
    return NextResponse.json(seeded);
  }

  const delta = Number(body.delta);
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'invalid_delta' }, { status: 400 });
  }
  const balances = await applyBalanceDelta(userId, delta, currency);
  // Fiat top-ups are the only balance change with no domain event behind
  // them — log it so the activity feed can show the deposit.
  if (body.reason === 'deposit' && delta > 0) {
    await saveActivity({
      id: makeActivityId(),
      userId,
      kind: 'deposit',
      amount: delta,
      currency,
      createdAt: Date.now(),
    });
  }
  return NextResponse.json(balances);
}
