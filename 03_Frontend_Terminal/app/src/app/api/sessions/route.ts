import { NextRequest, NextResponse } from 'next/server';
import {
  getMerchant,
  listSessions,
  makeSessionId,
  saveSession,
  type SessionState,
} from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let sessions = await listSessions();
  const user = req.nextUrl.searchParams.get('user');
  if (user) sessions = sessions.filter((s) => s.userId === user);
  const activeOnly = req.nextUrl.searchParams.get('active') === '1';
  return NextResponse.json(activeOnly ? sessions.filter((s) => !s.ended) : sessions);
}

export async function POST(req: NextRequest) {
  const merchant = await getMerchant();
  const body = await req.json().catch(() => ({}));

  if (!merchant.active) {
    return NextResponse.json({ error: 'merchant_inactive' }, { status: 409 });
  }

  // One active consumption per user — re-scanning the QR resumes, never
  // creates a parallel session.
  const userId = String(body.userId ?? '').slice(0, 80);
  if (userId) {
    const existing = (await listSessions()).find(
      (s) => s.userId === userId && !s.ended,
    );
    if (existing) {
      return NextResponse.json(
        { error: 'active_session', session: existing },
        { status: 409 },
      );
    }
  }

  const maxCap = Number(body.maxCap);
  if (!Number.isFinite(maxCap) || maxCap <= 0) {
    return NextResponse.json({ error: 'invalid_cap' }, { status: 400 });
  }

  const session: SessionState = {
    id: makeSessionId(),
    merchantQrId: merchant.qrId,
    merchantName: merchant.name,
    userId: userId || 'anon',
    userName: String(body.userName ?? 'Cliente').slice(0, 40),
    startTime: Date.now(),
    ratePerSecond: merchant.ratePerMinute / 60,
    currency: body.currency === 'USD' ? 'USD' : 'ARS',
    maxCap,
    ended: false,
  };
  await saveSession(session);
  return NextResponse.json(session, { status: 201 });
}
