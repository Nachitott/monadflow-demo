import { NextRequest, NextResponse } from 'next/server';
import {
  listAgreements,
  makeAgreementId,
  saveAgreement,
  type AgreementState,
} from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const agreements = await listAgreements();
  const contractor = req.nextUrl.searchParams.get('contractor');
  const client = req.nextUrl.searchParams.get('client');
  let out = agreements;
  if (contractor) out = out.filter((a) => a.contractorId === contractor);
  if (client) out = out.filter((a) => a.clientId === client);
  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const totalAmount = Number(body.totalAmount);
  const stageCount = Math.floor(Number(body.stageCount));
  const autoApproveDays = Math.max(0, Number(body.autoApproveDays) || 0);
  if (
    !body.title?.trim() ||
    !Number.isFinite(totalAmount) ||
    totalAmount <= 0 ||
    !Number.isFinite(stageCount) ||
    stageCount < 1 ||
    stageCount > 24
  ) {
    return NextResponse.json({ error: 'invalid_agreement' }, { status: 400 });
  }

  const agreement: AgreementState = {
    id: makeAgreementId(),
    title: String(body.title).trim().slice(0, 80),
    totalAmount,
    currency: body.currency === 'USD' ? 'USD' : 'ARS',
    stageCount,
    autoApproveDays,
    contractorId: String(body.contractorId ?? 'anon').slice(0, 80),
    contractorName: String(body.contractorName ?? 'Contratista').slice(0, 40),
    linkActive: true,
    status: 'pending',
    stages: Array.from({ length: stageCount }, () => ({ approved: false })),
    createdAt: Date.now(),
  };
  await saveAgreement(agreement);
  return NextResponse.json(agreement, { status: 201 });
}
