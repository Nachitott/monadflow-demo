'use client';

import { useEffect, useState } from 'react';

export type Currency = 'ARS' | 'USD';

/** ARS per 1 USD — simulated quote until MockExchange goes on-chain. */
const BASE_RATE = 1200;
const REFRESH_MS = 30_000;

export function useExchangeRate() {
  const [rate, setRate] = useState(BASE_RATE);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    setUpdatedAt(new Date());
    // Simulated quote refresh with a small drift (±0.4%).
    const id = setInterval(() => {
      setRate((r) => {
        const drift = r * (Math.random() * 0.008 - 0.004);
        return Math.round((r + drift) * 100) / 100;
      });
      setUpdatedAt(new Date());
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const toUSD = (ars: number) => ars / rate;
  const toARS = (usd: number) => usd * rate;

  return { rate, updatedAt, toUSD, toARS };
}

export function formatAmount(amount: number, currency: Currency) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
