import type { Currency } from '@/lib/useExchangeRate';

/**
 * Shared demo state living in the Next.js server process.
 * Works on `next dev` and on a warm Vercel lambda. If the serverless
 * instance is recycled, the store resets — acceptable for the demo;
 * the real persistence is the contracts layer (Fase 5).
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

const newQrId = () =>
  `qr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const g = globalThis as unknown as { __monadflow?: Store };

export function getStore(): Store {
  if (!g.__monadflow) {
    g.__monadflow = {
      merchant: {
        name: 'Mi comercio',
        ratePerMinute: 25,
        qrId: newQrId(),
        active: true,
      },
      sessions: [],
    };
  }
  return g.__monadflow;
}

export function accrued(s: SessionState, now = Date.now()): number {
  const end = s.ended && s.endTime ? s.endTime : now;
  return Math.min(Math.max(0, (end - s.startTime) / 1000) * s.ratePerSecond, s.maxCap);
}

export const makeSessionId = () =>
  `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export { newQrId };
