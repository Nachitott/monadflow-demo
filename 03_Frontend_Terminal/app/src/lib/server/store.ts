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
  userName: string;
  startTime: number;
  ratePerSecond: number;
  currency: Currency;
  maxCap: number;
  ended: boolean;
  endTime?: number;
  totalPaid?: number;
}

interface Store {
  merchant: MerchantState;
  sessions: SessionState[];
}

const K_MERCHANT = 'mf:merchant';
const K_SESSIONS = 'mf:sessions';

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
  if (!g.__monadflow) g.__monadflow = { merchant: freshMerchant(), sessions: [] };
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

export { newQrId, makeSessionId };
