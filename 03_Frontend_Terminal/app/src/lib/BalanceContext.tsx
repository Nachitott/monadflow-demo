'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import type { Currency } from './useExchangeRate';

export type Balances = Record<Currency, number>;

const ZERO: Balances = { ARS: 0, USD: 0 };
const storageKey = (userId: string) => `monadflow:balance:${userId}`;

interface BalanceContextValue {
  balances: Balances;
  /** Positive delta adds funds, negative deducts (clamped at 0). */
  updateBalance: (delta: number, currency: Currency) => void;
}

const BalanceContext = createContext<BalanceContextValue>({
  balances: ZERO,
  updateBalance: () => {},
});

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = usePrivy();
  const [balances, setBalances] = useState<Balances>(ZERO);
  const loadedFor = useRef<string | null>(null);

  // Load the persisted balance for whoever is logged in.
  useEffect(() => {
    if (!user?.id) {
      setBalances(ZERO);
      loadedFor.current = null;
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(user.id));
      const parsed = raw ? (JSON.parse(raw) as Partial<Balances>) : {};
      setBalances({
        ARS: typeof parsed.ARS === 'number' ? parsed.ARS : 0,
        USD: typeof parsed.USD === 'number' ? parsed.USD : 0,
      });
    } catch {
      setBalances(ZERO);
    }
    loadedFor.current = user.id;
  }, [user?.id]);

  // Persist on every change (only after the user's data was loaded).
  useEffect(() => {
    if (!user?.id || loadedFor.current !== user.id) return;
    localStorage.setItem(storageKey(user.id), JSON.stringify(balances));
  }, [balances, user?.id]);

  const updateBalance = useCallback((delta: number, currency: Currency) => {
    setBalances((b) => ({ ...b, [currency]: Math.max(0, b[currency] + delta) }));
  }, []);

  return (
    <BalanceContext.Provider value={{ balances, updateBalance }}>
      {children}
    </BalanceContext.Provider>
  );
}

export const useBalances = () => useContext(BalanceContext);
