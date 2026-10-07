'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import type { Currency } from './useExchangeRate';
import { fetchBalances, postBalanceDelta, seedBalances } from './api';

export type Balances = Record<Currency, number>;

const ZERO: Balances = { ARS: 0, USD: 0 };
// fetchBalances returns `null` when the user has no server record yet.
const storageKey = (userId: string) => `monadflow:balance:${userId}`;

interface BalanceContextValue {
  balances: Balances;
  /** Positive delta adds funds, negative deducts (clamped at 0). */
  updateBalance: (delta: number, currency: Currency) => void;
  /** Pull the authoritative balance from the server (e.g. after a transfer). */
  refreshBalances: () => void;
}

const BalanceContext = createContext<BalanceContextValue>({
  balances: ZERO,
  updateBalance: () => {},
  refreshBalances: () => {},
});

const readLocal = (userId: string): Balances => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as Partial<Balances>) : {};
    return {
      ARS: typeof parsed.ARS === 'number' ? parsed.ARS : 0,
      USD: typeof parsed.USD === 'number' ? parsed.USD : 0,
    };
  } catch {
    return ZERO;
  }
};

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = usePrivy();
  const userId = user?.id;
  const [balances, setBalances] = useState<Balances>(ZERO);
  const loadedFor = useRef<string | null>(null);

  // Server is authoritative; localStorage is the instant-paint cache.
  const syncFromServer = useCallback(async (uid: string, local: Balances) => {
    try {
      const server = await fetchBalances(uid);
      if (server && typeof server.ARS === 'number') {
        setBalances(server);
        localStorage.setItem(storageKey(uid), JSON.stringify(server));
      } else {
        // No server record yet → one-time seed from the local cache.
        const seeded = await seedBalances(uid, local);
        setBalances(seeded);
        localStorage.setItem(storageKey(uid), JSON.stringify(seeded));
      }
    } catch {
      // Offline/API down — keep the cached local balance.
    }
  }, []);

  // Load cached balance instantly, then reconcile with the server.
  useEffect(() => {
    if (!userId) {
      setBalances(ZERO);
      loadedFor.current = null;
      return;
    }
    const local = readLocal(userId);
    setBalances(local);
    loadedFor.current = userId;
    syncFromServer(userId, local);
  }, [userId, syncFromServer]);

  const refreshBalances = useCallback(() => {
    if (!userId) return;
    fetchBalances(userId)
      .then((server) => {
        if (server && typeof server.ARS === 'number') {
          setBalances(server);
          localStorage.setItem(storageKey(userId), JSON.stringify(server));
        }
      })
      .catch(() => {});
  }, [userId]);

  // Pick up incoming transfers / changes from other devices on focus.
  useEffect(() => {
    window.addEventListener('focus', refreshBalances);
    return () => window.removeEventListener('focus', refreshBalances);
  }, [refreshBalances]);

  // Persist to localStorage on every change (after load).
  useEffect(() => {
    if (!userId || loadedFor.current !== userId) return;
    localStorage.setItem(storageKey(userId), JSON.stringify(balances));
  }, [balances, userId]);

  const updateBalance = useCallback(
    (delta: number, currency: Currency) => {
      setBalances((b) => ({ ...b, [currency]: Math.max(0, b[currency] + delta) }));
      if (userId) postBalanceDelta(userId, delta, currency).catch(() => {});
    },
    [userId],
  );

  return (
    <BalanceContext.Provider value={{ balances, updateBalance, refreshBalances }}>
      {children}
    </BalanceContext.Provider>
  );
}

export const useBalances = () => useContext(BalanceContext);
