import type { Currency } from '@/lib/useExchangeRate';
import { kvEnabled, kvGetJson, kvSetJson } from './db';

/**
 * Shared demo state. On Vercel it lives in KV/Upstash so every
 * serverless instance sees the same merchant + sessions (this is what
 * fixed the "rotating QR" / revived codes). Locally without env vars it
 * falls back to an in-memory object — fine for single-process dev.
 */

export interface MerchantState {
  name: string;
  ratePerMinute: number; // ARS
  qrId: string;
  active: boolean;
}

export interface SessionState {
  id: string;
  merchantQrId: string;
  merchantName: string;
  userId: string;
  userName: string;
  startTime: number;
  ratePerSecond: number;
  currency: Currency;
  maxCap: number;
  ended: boolean;
  endTime?: number;
  totalPaid?: number;
}

export interface AgreementStage {
  /** Client green light — required before the contractor can deliver. */
  authorizedAt?: number;
  deliveredAt?: number;
  approved: boolean;
  paidAt?: number;
}

export interface AgreementState {
  id: string;
  title: string;
  totalAmount: number;
  currency: Currency;
  stageCount: number;
  autoApproveDays: number; // 0 = disabled
  contractorId: string;
  contractorName: string;
  clientId?: string;
  clientName?: string;
  linkActive: boolean; // killswitch (pre-deposit)
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  stages: AgreementStage[];
  createdAt: number;
  cancelledAt?: number;
}

interface Store {
  merchant: MerchantState;
  sessions: SessionState[];
  agreements: AgreementState[];
}

const K_MERCHANT = 'mf:merchant';
const K_SESSIONS = 'mf:sessions';
const K_AGREEMENTS = 'mf:agreements';

const newQrId = () =>
  `qr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const makeSessionId = () =>
  `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const freshMerchant = (): MerchantState => ({
  name: 'Mi comercio',
  ratePerMinute: 25,
  qrId: newQrId(),
  active: true,
});

// ---- in-memory fallback (local dev without KV) ----
const g = globalThis as unknown as { __monadflow?: Store };
function memStore(): Store {
  if (!g.__monadflow)
    g.__monadflow = { merchant: freshMerchant(), sessions: [], agreements: [] };
  if (!g.__monadflow.agreements) g.__monadflow.agreements = [];
  return g.__monadflow;
}

// ---- public async API ----

export async function getMerchant(): Promise<MerchantState> {
  if (!kvEnabled()) return memStore().merchant;
  const m = await kvGetJson<MerchantState>(K_MERCHANT);
  if (m) return m;
  const fresh = freshMerchant();
  await kvSetJson(K_MERCHANT, fresh);
  return fresh;
}

export async function saveMerchant(m: MerchantState): Promise<void> {
  if (!kvEnabled()) {
    memStore().merchant = m;
    return;
  }
  await kvSetJson(K_MERCHANT, m);
}

export async function listSessions(): Promise<SessionState[]> {
  if (!kvEnabled()) return memStore().sessions;
  return (await kvGetJson<SessionState[]>(K_SESSIONS)) ?? [];
}

export async function getSession(id: string): Promise<SessionState | undefined> {
  return (await listSessions()).find((s) => s.id === id);
}

export async function saveSession(s: SessionState): Promise<void> {
  const sessions = kvEnabled()
    ? ((await kvGetJson<SessionState[]>(K_SESSIONS)) ?? [])
    : memStore().sessions;
  const i = sessions.findIndex((x) => x.id === s.id);
  if (i >= 0) sessions[i] = s;
  else sessions.push(s);
  if (kvEnabled()) await kvSetJson(K_SESSIONS, sessions);
}

export function accrued(s: SessionState, now = Date.now()): number {
  const end = s.ended && s.endTime ? s.endTime : now;
  return Math.min(Math.max(0, (end - s.startTime) / 1000) * s.ratePerSecond, s.maxCap);
}

// ---- Agreements (Modo 2) ----

export async function listAgreements(): Promise<AgreementState[]> {
  if (!kvEnabled()) return memStore().agreements;
  return (await kvGetJson<AgreementState[]>(K_AGREEMENTS)) ?? [];
}

export async function getAgreement(id: string): Promise<AgreementState | undefined> {
  return (await listAgreements()).find((a) => a.id === id);
}

export async function saveAgreement(a: AgreementState): Promise<void> {
  const agreements = kvEnabled()
    ? ((await kvGetJson<AgreementState[]>(K_AGREEMENTS)) ?? [])
    : memStore().agreements;
  const i = agreements.findIndex((x) => x.id === a.id);
  if (i >= 0) agreements[i] = a;
  else agreements.push(a);
  if (kvEnabled()) await kvSetJson(K_AGREEMENTS, agreements);
}

export const stageAmount = (a: AgreementState): number =>
  a.totalAmount / a.stageCount;

/** Frozen amount = approved+pending stages still locked (everything not paid). */
export const frozenAmount = (a: AgreementState): number =>
  a.stages.filter((s) => !s.approved).length * stageAmount(a);

export const makeAgreementId = () =>
  `ag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export async function deleteAgreement(id: string): Promise<boolean> {
  const agreements = kvEnabled()
    ? ((await kvGetJson<AgreementState[]>(K_AGREEMENTS)) ?? [])
    : memStore().agreements;
  const i = agreements.findIndex((x) => x.id === id);
  if (i < 0) return false;
  agreements.splice(i, 1);
  if (kvEnabled()) await kvSetJson(K_AGREEMENTS, agreements);
  return true;
}

export { newQrId, makeSessionId };
