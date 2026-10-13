'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { erc20Abi, type Address } from 'viem';
import {
  fetchMyAlias,
  fetchTransfers,
  registerAlias as apiRegisterAlias,
  resolveAlias as apiResolveAlias,
  sendTransfer,
  type Transfer,
  type UserAlias,
} from './api';
import { CHAIN_ENABLED } from './chainMode';
import { chainReady, getEmbeddedAddress, tokenOf, toUnits } from './contracts';
import { useContractTx } from './hooks/useContractTx';
import { useGasFaucet } from './hooks/useGasFaucet';
import type { Currency } from './useExchangeRate';

/**
 * Modo 3 seam — the ONLY place the UI talks to for P2P money movement.
 * Mock: POST /api/transfers moves balances on the shared backend.
 * Chain: MockARS/MockUSDC.transfer straight to the recipient's embedded
 * wallet, then the API only files the receipt (chain:true, no balance ops).
 * Screens stay untouched in both modes.
 */
export function useTransfers() {
  const { user } = usePrivy();
  const { send: sendTx } = useContractTx();
  const onChain = CHAIN_ENABLED && chainReady;
  const address = getEmbeddedAddress(user);
  // Silent MON top-up — chain transfers need gas until the paymaster lands.
  useGasFaucet();
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

  // Silent heal: chain-mode aliases need the wallet address on file.
  // Re-registering one's own alias just updates the record.
  const healed = useRef(false);
  useEffect(() => {
    if (!onChain || healed.current || !user?.id || !myAlias || myAlias.walletAddress || !address)
      return;
    healed.current = true;
    apiRegisterAlias({
      userId: user.id,
      alias: myAlias.alias,
      displayName: myAlias.displayName,
      walletAddress: address,
    })
      .then((r) => r.alias && setMyAlias(r.alias))
      .catch(() => {});
  }, [onChain, user?.id, myAlias, address]);

  const send = useCallback(
    async (to: string, amount: number, currency: Currency, note?: string) => {
      if (!user?.id) return { error: 'not_authenticated' };

      if (onChain) {
        const recipient = await apiResolveAlias(to);
        if (!recipient) return { error: 'alias_not_found' };
        if (!recipient.walletAddress) return { error: 'recipient_not_ready' };
        if (recipient.walletAddress.toLowerCase() === address?.toLowerCase())
          return { error: 'self_transfer' };
        const token = tokenOf(currency);
        if (!token || !address) return { error: 'transfer_error' };
        try {
          const { hash } = await sendTx({
            address: token,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipient.walletAddress as Address, toUnits(amount, currency)],
          });
          // File the receipt — no balance ops server-side in chain mode.
          const { transfer, error } = await sendTransfer({
            fromUserId: user.id,
            fromName: displayName,
            toAlias: recipient.alias,
            amount,
            currency,
            note,
            chain: true,
            txRef: hash,
          });
          if (transfer) await refresh();
          return { transfer, error };
        } catch {
          return { error: 'transfer_error' };
        }
      }

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
    [user?.id, displayName, refresh, onChain, address, sendTx],
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
        walletAddress: onChain ? address : undefined,
      });
      if (result.alias) setMyAlias(result.alias);
      return result;
    },
    [user?.id, displayName, onChain, address],
  );

  return { send, resolveAlias, registerAlias, history, refresh, myAlias };
}
