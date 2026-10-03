'use client';

import type { Currency } from './useExchangeRate';

export interface StreamSession {
  id: string;
  merchantName: string;
  userName: string;
  merchantQrId?: string;
  startTime: number; // unix ms
  ratePerSecond: number; // in `currency` units
  currency: Currency;
  maxCap: number;
  ended: boolean;
  endTime?: number;
  totalPaid?: number;
}

const SESSIONS_KEY = 'monadflow:stream:sessions';

const read = (): StreamSession[] => {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]');
  } catch {
    return [];
  }
};

const write = (sessions: StreamSession[]) =>
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

export const listSessions = (): StreamSession[] => read();

export const activeSessions = (): StreamSession[] => read().filter((s) => !s.ended);

export function startSession(
  s: Omit<StreamSession, 'id' | 'startTime' | 'ended'>,
): StreamSession {
  const session: StreamSession = {
    ...s,
    id: `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    startTime: Date.now(),
    ended: false,
  };
  write([...read(), session]);
  window.dispatchEvent(new Event('monadflow:storage'));
  return session;
}

export function getSession(id: string): StreamSession | undefined {
  return read().find((s) => s.id === id);
}

export function endSession(id: string, totalPaid: number): void {
  write(
    read().map((s) =>
      s.id === id ? { ...s, ended: true, endTime: Date.now(), totalPaid } : s,
    ),
  );
  window.dispatchEvent(new Event('monadflow:storage'));
}

/** Closes every active session, charging what was accrued so far.
 *  Called when the merchant generates a brand-new QR code. */
export function endAllActiveSessions(): number {
  const now = Date.now();
  const all = read();
  const closed = all.filter((s) => !s.ended).length;
  write(
    all.map((s) =>
      s.ended ? s : { ...s, ended: true, endTime: now, totalPaid: accruedAmount(s, now) },
    ),
  );
  window.dispatchEvent(new Event('monadflow:storage'));
  return closed;
}

export function accruedAmount(s: StreamSession, now = Date.now()): number {
  const end = s.ended && s.endTime ? s.endTime : now;
  const seconds = Math.max(0, (end - s.startTime) / 1000);
  return Math.min(seconds * s.ratePerSecond, s.maxCap);
}

/** Subscribe to cross-tab + same-tab session changes. */
export function onSessionsChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener('storage', handler);
  window.addEventListener('monadflow:storage', handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('monadflow:storage', handler);
  };
}

/** Seed two demo customers so the merchant dashboard isn't empty in the demo.
 *  Runs only once ever — regenerating the QR must leave the grid clean. */
export function seedDemoSessions(): void {
  if (localStorage.getItem('monadflow:demo-seeded')) return;
  localStorage.setItem('monadflow:demo-seeded', '1');
  if (read().some((s) => !s.ended)) return;
  const now = Date.now();
  write([
    ...read(),
    {
      id: 'demo-1',
      merchantName: 'Cowork Central',
      userName: 'Martina G.',
      startTime: now - 42 * 60_000,
      ratePerSecond: 25 / 60,
      currency: 'ARS',
      maxCap: 5000,
      ended: false,
    },
    {
      id: 'demo-2',
      merchantName: 'Cowork Central',
      userName: 'Julián P.',
      startTime: now - 11 * 60_000,
      ratePerSecond: 25 / 60,
      currency: 'ARS',
      maxCap: 3000,
      ended: false,
    },
  ]);
}
