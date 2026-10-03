import { NextRequest, NextResponse } from 'next/server';
import { getSession, saveSession } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(params.id);
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(session);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(params.id);
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body.action === 'end' && !session.ended) {
    const paid = Number(body.totalPaid);
    session.ended = true;
    session.endTime = Date.now();
    session.totalPaid = Number.isFinite(paid) && paid >= 0 ? paid : 0;
    await saveSession(session);
  }
  return NextResponse.json(session);
}
