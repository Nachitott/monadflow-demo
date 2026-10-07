'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  fetchMyAlias,
  fetchTransfers,
  registerAlias as apiRegisterAlias,
  resolveAlias as apiResolveAlias,
  sendTransfer,
  type Transfer,
  type UserAlias,
} from './api';
import type { Currency } from './useExchangeRate';

/**
 * Modo 3 seam — the ONLY place the UI talks to for P2P money movement.
 * Demo: POST /api/transfers on the shared mock backend.
 * Post-MVP: swap `send` to MockUSDC/MockARS.transfer (or TransferHub.sendTo)
 * via the gasless Smart Account — screens stay untouched.
 */
export function useTransfers() {
  const { user } = usePrivy();
  const [history, setHistory] = useState<Transfer[]>([]);
  const [myAlias, setMyAlias] = useState<UserAlias | null>(null);

  const displayName =
    user?.google?.name ?? user?.apple?.email ?? user?.email?.address ?? 'Usuario';

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const [transfers, alias] = await Promise.all([
      fetchTransfers(user.id).catch(() => [] as Transfer[]),
      fetchMyAlias(user.id).catch(() => null),
    ]);
    setHistory(transfers);
    setMyAlias(alias);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const send = useCallback(
    async (to: string, amount: number, currency: Currency, note?: string) => {
      if (!user?.id) return { error: 'not_authenticated' };
      const { transfer, error } = await sendTransfer({
        fromUserId: user.id,
        fromName: displayName,
        toAlias: to,
        amount,
        currency,
        note,
      });
      if (transfer) await refresh();
      return { transfer, error };
    },
    [user?.id, displayName, refresh],
  );

  const resolveAlias = useCallback(
    (alias: string) => apiResolveAlias(alias),
    [],
  );

  const registerAlias = useCallback(
    async (alias: string) => {
      if (!user?.id) return { error: 'not_authenticated' };
      const result = await apiRegisterAlias({
        userId: user.id,
        alias,
        displayName,
      });
      if (result.alias) setMyAlias(result.alias);
      return result;
    },
    [user?.id, displayName],
  );

  return { send, resolveAlias, registerAlias, history, refresh, myAlias };
}
