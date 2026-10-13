'use client';

import { useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { CHAIN_ENABLED } from './chainMode';
import { ABIS, chainReady, CONTRACTS, fromUnits } from './contracts';

export type Currency = 'ARS' | 'USD';

/** ARS per 1 USD — simulated quote until MockExchange goes on-chain. */
const BASE_RATE = 1200;
const REFRESH_MS = 30_000;

export function useExchangeRate() {
  const [simRate, setSimRate] = useState(BASE_RATE);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // On-chain rate: arsPerUsd lives in MockExchange (1e18 scale → ARS units).
  const { data: onchainRate } = useReadContract({
    address: CONTRACTS.mockExchange,
    abi: ABIS.mockExchange,
    functionName: 'arsPerUsd',
    query: {
      enabled: CHAIN_ENABLED && chainReady,
      refetchInterval: REFRESH_MS,
    },
  });

  useEffect(() => {
    setUpdatedAt(new Date());
    if (CHAIN_ENABLED && chainReady) return; // quote comes from the contract
    // Simulated quote refresh with a small drift (±0.4%).
    const id = setInterval(() => {
      setSimRate((r) => {
        const drift = r * (Math.random() * 0.008 - 0.004);
        return Math.round((r + drift) * 100) / 100;
      });
      setUpdatedAt(new Date());
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const rate =
    CHAIN_ENABLED && chainReady && typeof onchainRate === 'bigint'
      ? fromUnits(onchainRate, 'ARS')
      : simRate;

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
