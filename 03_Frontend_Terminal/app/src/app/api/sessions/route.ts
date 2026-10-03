import { NextRequest, NextResponse } from 'next/server';
import { getStore, makeSessionId, type SessionState } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { sessions } = getStore();
  const activeOnly = req.nextUrl.searchParams.get('active') === '1';
  return NextResponse.json(activeOnly ? sessions.filter((s) => !s.ended) : sessions);
}

export async function POST(req: NextRequest) {
  const store = getStore();
  const body = await req.json().catch(() => ({}));

  if (!store.merchant.active) {
    return NextResponse.json({ error: 'merchant_inactive' }, { status: 409 });
  }

  const maxCap = Number(body.maxCap);
  if (!Number.isFinite(maxCap) || maxCap <= 0) {
    return NextResponse.json({ error: 'invalid_cap' }, { status: 400 });
  }

  const session: SessionState = {
    id: makeSessionId(),
    merchantQrId: store.merchant.qrId,
    merchantName: store.merchant.name,
    userName: String(body.userName ?? 'Cliente').slice(0, 40),
    startTime: Date.now(),
    ratePerSecond: store.merchant.ratePerMinute / 60,
    currency: body.currency === 'USD' ? 'USD' : 'ARS',
    maxCap,
    ended: false,
  };
  store.sessions.push(session);
  return NextResponse.json(session, { status: 201 });
}
