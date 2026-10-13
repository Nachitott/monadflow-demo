'use client';

import { useReadContract } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { erc20Abi } from 'viem';
import { CHAIN_ENABLED } from '../chainMode';
import {
  chainReady,
  CONTRACTS,
  fromUnits,
  getEmbeddedAddress,
} from '../contracts';

/**
 * Dual-wallet balances read straight from the mock ERC-20s at the user's
 * embedded wallet. Only active in chain mode — BalanceContext falls back
 * to the KV balances when the flag is off.
 */
export function useDualWallet() {
  const { user } = usePrivy();
  const address = getEmbeddedAddress(user);
  const enabled = CHAIN_ENABLED && chainReady && Boolean(address);
  const query = { enabled, refetchInterval: 10_000 } as const;

  const ars = useReadContract({
    address: CONTRACTS.mockArs,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query,
  });
  const usd = useReadContract({
    address: CONTRACTS.mockUsdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query,
  });

  return {
    balanceARS: typeof ars.data === 'bigint' ? fromUnits(ars.data, 'ARS') : 0,
    balanceUSD: typeof usd.data === 'bigint' ? fromUnits(usd.data, 'USD') : 0,
    refresh: () => {
      void ars.refetch();
      void usd.refetch();
    },
    address,
  };
}
