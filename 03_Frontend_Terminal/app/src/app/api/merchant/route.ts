import { NextRequest, NextResponse } from 'next/server';
import { accrued, getStore, newQrId } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getStore().merchant);
}

export async function POST(req: NextRequest) {
  const store = getStore();
  const body = await req.json().catch(() => ({}));

  switch (body.action) {
    case 'deactivate':
      store.merchant.active = false;
      break;
    case 'regenerate': {
      // New code from scratch: close every open session, charging only
      // what each client actually consumed.
      const now = Date.now();
      for (const s of store.sessions) {
        if (!s.ended) {
          s.ended = true;
          s.endTime = now;
          s.totalPaid = accrued(s, now);
        }
      }
      store.merchant.qrId = newQrId();
      store.merchant.active = true;
      break;
    }
    case 'update':
      if (typeof body.name === 'string' && body.name.trim()) {
        store.merchant.name = body.name.trim().slice(0, 40);
      }
      if (typeof body.ratePerMinute === 'number' && body.ratePerMinute > 0) {
        store.merchant.ratePerMinute = body.ratePerMinute;
      }
      break;
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }

  return NextResponse.json(store.merchant);
}
