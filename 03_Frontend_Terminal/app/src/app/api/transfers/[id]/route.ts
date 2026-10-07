import { NextRequest, NextResponse } from 'next/server';
import { getTransfer } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const transfer = await getTransfer(params.id);
  if (!transfer) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(transfer);
}
