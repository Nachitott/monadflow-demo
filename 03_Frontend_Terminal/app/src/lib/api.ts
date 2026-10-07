'use client';

import type {
  AgreementState,
  AliasRecord,
  MerchantState,
  SessionState,
  TransferRecord,
} from '@/lib/server/store';
import type { Currency } from './useExchangeRate';

export type Merchant = MerchantState;
export type StreamSession = SessionState;
export type Agreement = AgreementState;
export type Transfer = TransferRecord;
export type UserAlias = AliasRecord;
export interface BalancesShape {
  ARS: number;
  USD: number;
}

const json = <T>(r: Response) => r.json() as Promise<T>;

export const fetchMerchant = () => fetch('/api/merchant').then(json<Merchant>);

export const merchantAction = (body: Record<string, unknown>) =>
  fetch('/api/merchant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json<Merchant>);

export const fetchSessions = (activeOnly = false) =>
  fetch(`/api/sessions${activeOnly ? '?active=1' : ''}`).then(json<StreamSession[]>);

export const fetchSession = (id: string) =>
  fetch(`/api/sessions/${id}`).then((r) => (r.ok ? json<StreamSession>(r) : null));

export const createSession = async (body: {
  userId: string;
  userName: string;
  maxCap: number;
  currency: Currency;
}): Promise<{ session: StreamSession; resumed: boolean }> => {
  const r = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  // 409 → the user already has an open consumption; resume that one.
  if (!r.ok && data.session) return { session: data.session, resumed: true };
  if (!r.ok) throw new Error(data.error ?? 'session_error');
  return { session: data, resumed: false };
};

export const fetchMyActiveSession = (userId: string) =>
  fetch(`/api/sessions?user=${encodeURIComponent(userId)}&active=1`)
    .then(json<StreamSession[]>)
    .then((s) => s[0] ?? null);

export const closeSession = (id: string, totalPaid: number) =>
  fetch(`/api/sessions/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'end', totalPaid }),
  }).then(json<StreamSession>);

export function accruedAmount(s: StreamSession, now = Date.now()): number {
  const end = s.ended && s.endTime ? s.endTime : now;
  return Math.min(
    Math.max(0, (end - s.startTime) / 1000) * s.ratePerSecond,
    s.maxCap,
  );
}

// ---- Agreements (Modo 2) ----

export const fetchAgreements = (params: Record<string, string> = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetch(`/api/agreements${q ? `?${q}` : ''}`).then(json<Agreement[]>);
};

export const fetchAgreement = (id: string) =>
  fetch(`/api/agreements/${id}`).then((r) => (r.ok ? json<Agreement>(r) : null));

export const createAgreement = (body: {
  title: string;
  totalAmount: number;
  stageCount: number;
  autoApproveDays: number;
  currency: Currency;
  contractorId: string;
  contractorName: string;
}) =>
  fetch('/api/agreements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json<Agreement>);

export const agreementAction = (id: string, body: Record<string, unknown>) =>
  fetch(`/api/agreements/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json<Agreement>);

export const stageAmountOf = (a: Agreement) => a.totalAmount / a.stageCount;
export const frozenAmountOf = (a: Agreement) =>
  a.stages.filter((s) => !s.approved).length * stageAmountOf(a);

// ---- Balances (server-side per user) ----

export const fetchBalances = (userId: string) =>
  fetch(`/api/balances?user=${encodeURIComponent(userId)}`).then(
    json<BalancesShape | null>,
  );

export const postBalanceDelta = (
  userId: string,
  delta: number,
  currency: Currency,
) =>
  fetch('/api/balances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, delta, currency }),
  }).then(json<BalancesShape>);

export const seedBalances = (userId: string, balances: BalancesShape) =>
  fetch('/api/balances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, balances, mode: 'seed' }),
  }).then(json<BalancesShape>);

// ---- Aliases + Transfers (Modo 3) ----

export const resolveAlias = (alias: string) =>
  fetch(`/api/aliases?alias=${encodeURIComponent(alias)}`).then((r) =>
    r.ok ? json<{ alias: string; displayName: string }>(r) : null,
  );

export const fetchMyAlias = (userId: string) =>
  fetch(`/api/aliases?user=${encodeURIComponent(userId)}`).then((r) =>
    r.ok ? json<UserAlias | null>(r) : null,
  );

export const registerAlias = async (body: {
  userId: string;
  alias: string;
  displayName: string;
}): Promise<{ alias?: UserAlias; error?: string }> => {
  const r = await fetch('/api/aliases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) return { error: data.error ?? 'alias_error' };
  return { alias: data as UserAlias };
};

export const fetchTransfers = (userId: string) =>
  fetch(`/api/transfers?user=${encodeURIComponent(userId)}`).then(json<Transfer[]>);

export const sendTransfer = async (body: {
  fromUserId: string;
  fromName: string;
  toAlias: string;
  amount: number;
  currency: Currency;
  note?: string;
}): Promise<{ transfer?: Transfer; error?: string }> => {
  const r = await fetch('/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) return { error: data.error ?? 'transfer_error' };
  return { transfer: data as Transfer };
};
