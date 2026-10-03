'use client';

import type { MerchantState, SessionState } from '@/lib/server/store';
import type { Currency } from './useExchangeRate';

export type Merchant = MerchantState;
export type StreamSession = SessionState;

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
