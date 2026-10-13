'use client';

import { useCallback } from 'react';
import { usePublicClient, useWriteContract } from 'wagmi';
import { erc20Abi, type Abi, type Address } from 'viem';
import { tokenOf } from '../contracts';
import { errorCode } from '../friendlyError';
import type { Currency } from '../useExchangeRate';

interface TxConfig {
  address: Address;
  abi: Abi | readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
}

/**
 * Thin wrapper over wagmi writes: sends the tx and waits for the receipt,
 * throwing a plain Error on revert so callers can map it to the generic
 * es-AR message (Web3 Invisible — never surface revert data).
 */
export function useContractTx() {
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient();

  const send = useCallback(
    async (config: TxConfig) => {
      if (!client) throw new Error('no_client');
      try {
        const hash = await writeContractAsync(config as never);
        const receipt = await client.waitForTransactionReceipt({ hash });
        if (receipt.status === 'reverted') throw new Error('reverted');
        return { hash, receipt };
      } catch (e) {
        // Web3-invisible: never propagate raw wagmi/viem text (revert
        // reasons, hex blobs, network names) — only a stable code that
        // callers map to es-AR copy via friendlyError.humanError().
        throw new Error(errorCode(e));
      }
    },
    [client, writeContractAsync],
  );

  /** Approve `spender` for `amount` of the currency's token — skips if allowance suffices. */
  const ensureApproval = useCallback(
    async (currency: Currency, owner: Address, spender: Address, amount: bigint) => {
      const token = tokenOf(currency);
      if (!client || !token) throw new Error('no_token');
      const allowance = (await client.readContract({
        abi: erc20Abi,
        address: token,
        functionName: 'allowance',
        args: [owner, spender],
      })) as bigint;
      if (allowance >= amount) return;
      await send({
        abi: erc20Abi,
        address: token,
        functionName: 'approve',
        args: [spender, amount],
      });
    },
    [client, send],
  );

  return { send, ensureApproval };
}
