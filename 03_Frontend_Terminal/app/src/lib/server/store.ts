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

export interface TransferRecord {
  id: string; // 'tr-...' in demo; tx hash post-MVP
  from: string; // sender userId
  fromName: string;
  to: string; // recipient alias
  toUserId: string;
  amount: number;
  currency: Currency;
  note?: string;
  txRef?: string; // null in demo; on-chain receipt post-MVP
  status: 'completed' | 'pending' | 'failed';
  createdAt: number;
}

export interface AliasRecord {
  alias: string; // 'nacho.mp' — unique, lowercase
  userId: string;
  displayName: string;
}

/**
 * Append-only log for money events that can't be derived from the
 * domain stores (sessions/agreements/transfers already carry their own
 * timestamps). Today the only such event is a fiat top-up: the balance
 * delta alone leaves no trace, so the deposit writes a record here and
 * GET /api/activity merges it with the derived entries.
 */
export interface ActivityRecord {
  id: string; // 'ac-...'
  userId: string;
  kind: 'deposit';
  amount: number;
  currency: Currency;
  createdAt: number;
}

export type BalanceMap = Record<string, { ARS: number; USD: number }>;

interface Store {
  merchant: MerchantState;
  sessions: SessionState[];
  agreements: AgreementState[];
  transfers: TransferRecord[];
  aliases: AliasRecord[];
  balances: BalanceMap;
  activity: ActivityRecord[];
}

const K_MERCHANT = 'mf:merchant';
const K_SESSIONS = 'mf:sessions';
const K_AGREEMENTS = 'mf:agreements';
const K_TRANSFERS = 'mf:transfers';
const K_ALIASES = 'mf:aliases';
const K_BALANCES = 'mf:balances';
const K_ACTIVITY = 'mf:activity';

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
    g.__monadflow = {
      merchant: freshMerchant(),
      sessions: [],
      agreements: [],
      transfers: [],
      aliases: [],
      balances: {},
      activity: [],
    };
  if (!g.__monadflow.agreements) g.__monadflow.agreements = [];
  if (!g.__monadflow.transfers) g.__monadflow.transfers = [];
  if (!g.__monadflow.aliases) g.__monadflow.aliases = [];
  if (!g.__monadflow.balances) g.__monadflow.balances = {};
  if (!g.__monadflow.activity) g.__monadflow.activity = [];
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

// ---- Balances (server-side, per user) ----

export async function getBalances(
  userId: string,
): Promise<{ ARS: number; USD: number } | undefined> {
  const map = kvEnabled()
    ? ((await kvGetJson<BalanceMap>(K_BALANCES)) ?? {})
    : memStore().balances;
  return map[userId];
}

export async function setBalances(
  userId: string,
  balances: { ARS: number; USD: number },
): Promise<void> {
  const map = kvEnabled()
    ? ((await kvGetJson<BalanceMap>(K_BALANCES)) ?? {})
    : memStore().balances;
  map[userId] = balances;
  if (kvEnabled()) await kvSetJson(K_BALANCES, map);
}

export async function applyBalanceDelta(
  userId: string,
  delta: number,
  currency: Currency,
): Promise<{ ARS: number; USD: number }> {
  const current = (await getBalances(userId)) ?? { ARS: 0, USD: 0 };
  const next = { ...current, [currency]: Math.max(0, current[currency] + delta) };
  await setBalances(userId, next);
  return next;
}

// ---- Aliases (P2P registry) ----

const normalizeAlias = (alias: string) => alias.trim().toLowerCase();

export async function getAlias(alias: string): Promise<AliasRecord | undefined> {
  const target = normalizeAlias(alias);
  const aliases = kvEnabled()
    ? ((await kvGetJson<AliasRecord[]>(K_ALIASES)) ?? [])
    : memStore().aliases;
  return aliases.find((a) => a.alias === target);
}

export async function getAliasByUser(
  userId: string,
): Promise<AliasRecord | undefined> {
  const aliases = kvEnabled()
    ? ((await kvGetJson<AliasRecord[]>(K_ALIASES)) ?? [])
    : memStore().aliases;
  return aliases.find((a) => a.userId === userId);
}

export async function saveAlias(record: AliasRecord): Promise<void> {
  const aliases = kvEnabled()
    ? ((await kvGetJson<AliasRecord[]>(K_ALIASES)) ?? [])
    : memStore().aliases;
  const i = aliases.findIndex((a) => a.userId === record.userId);
  if (i >= 0) aliases[i] = record;
  else aliases.push(record);
  if (kvEnabled()) await kvSetJson(K_ALIASES, aliases);
}

// ---- Transfers (Modo 3) ----

export const makeTransferId = () =>
  `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export async function listTransfers(): Promise<TransferRecord[]> {
  if (!kvEnabled()) return memStore().transfers;
  return (await kvGetJson<TransferRecord[]>(K_TRANSFERS)) ?? [];
}

export async function getTransfer(
  id: string,
): Promise<TransferRecord | undefined> {
  return (await listTransfers()).find((t) => t.id === id);
}

export async function saveTransfer(t: TransferRecord): Promise<void> {
  const transfers = kvEnabled()
    ? ((await kvGetJson<TransferRecord[]>(K_TRANSFERS)) ?? [])
    : memStore().transfers;
  const i = transfers.findIndex((x) => x.id === t.id);
  if (i >= 0) transfers[i] = t;
  else transfers.push(t);
  if (kvEnabled()) await kvSetJson(K_TRANSFERS, transfers);
}

// ---- Activity log (non-derivable money events) ----

export const makeActivityId = () =>
  `ac-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export async function listActivity(): Promise<ActivityRecord[]> {
  if (!kvEnabled()) return memStore().activity;
  return (await kvGetJson<ActivityRecord[]>(K_ACTIVITY)) ?? [];
}

export async function saveActivity(a: ActivityRecord): Promise<void> {
  const activity = kvEnabled()
    ? ((await kvGetJson<ActivityRecord[]>(K_ACTIVITY)) ?? [])
    : memStore().activity;
  activity.push(a);
  if (kvEnabled()) await kvSetJson(K_ACTIVITY, activity);
}

export { newQrId, makeSessionId };
