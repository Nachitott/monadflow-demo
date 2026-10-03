import { NextRequest, NextResponse } from 'next/server';
import { accrued, getMerchant, listSessions, newQrId, saveMerchant, saveSession } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getMerchant());
}

export async function POST(req: NextRequest) {
  const merchant = await getMerchant();
  const body = await req.json().catch(() => ({}));

  switch (body.action) {
    case 'deactivate':
      merchant.active = false;
      break;
    case 'regenerate': {
      // New code from scratch: close every open session, charging only
      // what each client actually consumed.
      const now = Date.now();
      const sessions = await listSessions();
      for (const s of sessions) {
        if (!s.ended) {
          s.ended = true;
          s.endTime = now;
          s.totalPaid = accrued(s, now);
          await saveSession(s);
        }
      }
      merchant.qrId = newQrId();
      merchant.active = true;
      break;
    }
    case 'update':
      if (typeof body.name === 'string' && body.name.trim()) {
        merchant.name = body.name.trim().slice(0, 40);
      }
      if (typeof body.ratePerMinute === 'number' && body.ratePerMinute > 0) {
        merchant.ratePerMinute = body.ratePerMinute;
      }
      break;
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }

  await saveMerchant(merchant);
  return NextResponse.json(merchant);
}
