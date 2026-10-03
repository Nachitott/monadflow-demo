import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = getStore().sessions.find((s) => s.id === params.id);
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(session);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const store = getStore();
  const session = store.sessions.find((s) => s.id === params.id);
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body.action === 'end' && !session.ended) {
    const paid = Number(body.totalPaid);
    session.ended = true;
    session.endTime = Date.now();
    session.totalPaid = Number.isFinite(paid) && paid >= 0 ? paid : 0;
  }
  return NextResponse.json(session);
}
