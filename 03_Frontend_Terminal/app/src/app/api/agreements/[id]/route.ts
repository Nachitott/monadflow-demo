import { NextRequest, NextResponse } from 'next/server';
import { getAgreement, saveAgreement } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

/**
 * Lazily applies the auto-approve timer: a delivered stage the client
 * left unanswered for `autoApproveDays` is auto-approved. Mutates and
 * persists when something flipped.
 */
async function applyAutoApprove(id: string) {
  const a = await getAgreement(id);
  if (!a || a.status !== 'active' || !a.autoApproveDays) return a;
  const now = Date.now();
  const limit = a.autoApproveDays * 24 * 60 * 60 * 1000;
  let dirty = false;
  for (const s of a.stages) {
    if (!s.approved && s.deliveredAt && now - s.deliveredAt >= limit) {
      s.approved = true;
      s.paidAt = s.deliveredAt + limit;
      dirty = true;
    }
  }
  if (a.stages.every((s) => s.approved)) {
    a.status = 'completed';
    dirty = true;
  }
  if (dirty) await saveAgreement(a);
  return a;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const agreement = await applyAutoApprove(params.id);
  if (!agreement)
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(agreement);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const a = await applyAutoApprove(params.id);
  if (!a) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));

  switch (body.action) {
    case 'deactivate-link': // killswitch — only before deposit
      if (a.status !== 'pending')
        return NextResponse.json({ error: 'already_active' }, { status: 409 });
      a.linkActive = false;
      break;
    case 'reactivate-link':
      if (a.status !== 'pending')
        return NextResponse.json({ error: 'already_active' }, { status: 409 });
      a.linkActive = true;
      break;
    case 'deposit': {
      // Client locks 100% upfront.
      if (a.status !== 'pending')
        return NextResponse.json({ error: 'already_deposited' }, { status: 409 });
      if (!a.linkActive)
        return NextResponse.json({ error: 'link_inactive' }, { status: 409 });
      a.clientId = String(body.clientId ?? 'anon').slice(0, 80);
      a.clientName = String(body.clientName ?? 'Cliente').slice(0, 40);
      a.status = 'active';
      break;
    }
    case 'deliver': {
      if (a.status !== 'active')
        return NextResponse.json({ error: 'not_active' }, { status: 409 });
      const i = Number(body.stageIndex);
      const s = a.stages[i];
      if (!s || s.approved || s.deliveredAt)
        return NextResponse.json({ error: 'invalid_stage' }, { status: 400 });
      s.deliveredAt = Date.now();
      break;
    }
    case 'approve': {
      if (a.status !== 'active')
        return NextResponse.json({ error: 'not_active' }, { status: 409 });
      const i = Number(body.stageIndex);
      const s = a.stages[i];
      if (!s || s.approved)
        return NextResponse.json({ error: 'invalid_stage' }, { status: 400 });
      s.approved = true;
      s.paidAt = Date.now();
      if (a.stages.every((x) => x.approved)) a.status = 'completed';
      break;
    }
    case 'cancel': {
      // Cancellation is only enabled after stage 0 was paid.
      if (a.status !== 'active')
        return NextResponse.json({ error: 'not_cancellable' }, { status: 409 });
      if (!a.stages[0]?.approved)
        return NextResponse.json({ error: 'stage0_locked' }, { status: 409 });
      a.status = 'cancelled';
      a.cancelledAt = Date.now();
      break;
    }
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }

  await saveAgreement(a);
  return NextResponse.json(a);
}
