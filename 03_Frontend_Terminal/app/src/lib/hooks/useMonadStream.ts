'use client';

import { useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { decodeEventLog, type Address, type Hex } from 'viem';
import { CHAIN_ENABLED } from '../chainMode';
import {
  ABIS,
  chainReady,
  CONTRACTS,
  CURRENCY_TYPE,
  fromUnits,
  getEmbeddedAddress,
  toUnits,
} from '../contracts';
import { useContractTx } from './useContractTx';
import type { Currency } from '../useExchangeRate';

/** Merchant profile resolved from the on-chain registry (display units). */
export interface ChainMerchant {
  address: Address;
  /** Fiat-per-second rate in display units (e.g. ARS 0.42/s). */
  ratePerSecond: number;
  currency: Currency;
  disabled: boolean;
}

/** On-chain stream session mapped to display units. */
export interface ChainSession {
  id: Hex; // bytes32
  user: Address;
  merchant: Address;
  ratePerSecond: number;
  maxCap: number;
  startTime: number; // ms
  stopTime: number; // ms, 0 while active
  totalPaid: number;
  currency: Currency;
  active: boolean;
}

const STREAM_STARTED_SIG =
  'StreamStarted(bytes32,address,address,uint256,uint256,uint8)';
const STREAM_SETTLED_SIG =
  'StreamSettled(bytes32,address,address,uint256,uint256,uint256)';

export function useMonadStream() {
  const client = usePublicClient();
  const { user } = usePrivy();
  const { send, ensureApproval } = useContractTx();
  const address = getEmbeddedAddress(user);
  const onChain = CHAIN_ENABLED && chainReady;

  // ─── Reads ────────────────────────────────────────────────────────

  const merchantProfile = useCallback(
    async (merchant: Address): Promise<ChainMerchant | null> => {
      if (!client || !onChain || !CONTRACTS.timeStream) return null;
      // Public getters multi-output decoden como array posicional en viem;
      // se normaliza a objeto (los names del ABI llegan si el decode cambia).
      const raw = (await client.readContract({
        address: CONTRACTS.timeStream,
        abi: ABIS.timeStream,
        functionName: 'merchants',
        args: [merchant],
      })) as
        | [bigint, number, boolean]
        | { ratePerSecond: bigint; rateCurrency: number; disabled: boolean };
      const p = Array.isArray(raw)
        ? { ratePerSecond: raw[0], rateCurrency: raw[1], disabled: raw[2] }
        : raw;
      const currency: Currency = p.rateCurrency === 1 ? 'USD' : 'ARS';
      return {
        address: merchant,
        ratePerSecond: fromUnits(p.ratePerSecond, currency),
        currency,
        disabled: p.disabled,
      };
    },
    [client, onChain],
  );

  const getSession = useCallback(
    async (sessionId: Hex): Promise<ChainSession | null> => {
      if (!client || !onChain || !CONTRACTS.timeStream) return null;
      const s = (await client.readContract({
        address: CONTRACTS.timeStream,
        abi: ABIS.timeStream,
        functionName: 'getSession',
        args: [sessionId],
      })) as {
        id: Hex;
        user: Address;
        merchant: Address;
        ratePerSecond: bigint;
        maxCap: bigint;
        startTime: bigint;
        stopTime: bigint;
        totalPaid: bigint;
        currency: number;
        active: boolean;
      };
      if (s.user === '0x0000000000000000000000000000000000000000') return null;
      const currency: Currency = s.currency === 1 ? 'USD' : 'ARS';
      return {
        id: s.id,
        user: s.user,
        merchant: s.merchant,
        ratePerSecond: fromUnits(s.ratePerSecond, currency),
        maxCap: fromUnits(s.maxCap, currency),
        startTime: Number(s.startTime) * 1000,
        stopTime: Number(s.stopTime) * 1000,
        totalPaid: fromUnits(s.totalPaid, currency),
        currency,
        active: s.active,
      };
    },
    [client, onChain],
  );

  const myActiveSession = useCallback(async (): Promise<ChainSession | null> => {
    if (!client || !onChain || !address || !CONTRACTS.timeStream) return null;
    const ids = (await client.readContract({
      address: CONTRACTS.timeStream,
      abi: ABIS.timeStream,
      functionName: 'getUserSessions',
      args: [address],
    })) as Hex[];
    for (let i = ids.length - 1; i >= 0; i--) {
      const s = await getSession(ids[i]);
      if (s?.active) return s;
    }
    return null;
  }, [client, onChain, address, getSession]);

  /** Sessions for a merchant — all of them or only the active ones. */
  const merchantSessions = useCallback(
    async (merchant: Address, activeOnly = false): Promise<ChainSession[]> => {
      if (!client || !onChain || !CONTRACTS.timeStream) return [];
      const ids = (await client.readContract({
        address: CONTRACTS.timeStream,
        abi: ABIS.timeStream,
        functionName: 'getMerchantSessions',
        args: [merchant],
      })) as Hex[];
      const out: ChainSession[] = [];
      for (const id of ids) {
        const s = await getSession(id);
        if (s && (!activeOnly || s.active)) out.push(s);
      }
      return out;
    },
    [client, onChain, getSession],
  );

  // ─── Writes ───────────────────────────────────────────────────────

  const setRate = useCallback(
    async (ratePerSecondDisplay: number, currency: Currency) => {
      if (!CONTRACTS.timeStream) throw new Error('no_contract');
      return send({
        address: CONTRACTS.timeStream,
        abi: ABIS.timeStream,
        functionName: 'setRate',
        args: [toUnits(ratePerSecondDisplay, currency), CURRENCY_TYPE[currency]],
      });
    },
    [send],
  );

  const setQrEnabled = useCallback(
    async (enabled: boolean) => {
      if (!CONTRACTS.timeStream) throw new Error('no_contract');
      return send({
        address: CONTRACTS.timeStream,
        abi: ABIS.timeStream,
        functionName: enabled ? 'reactivateQR' : 'deactivateQR',
      });
    },
    [send],
  );

  /**
   * Approve cap + startStream. Returns the new sessionId parsed from the
   * StreamStarted event log.
   */
  const startStream = useCallback(
    async (merchant: Address, capDisplay: number, currency: Currency) => {
      if (!CONTRACTS.timeStream || !address) throw new Error('no_contract');
      const cap = toUnits(capDisplay, currency);
      await ensureApproval(currency, address, CONTRACTS.timeStream, cap);
      const { receipt } = await send({
        address: CONTRACTS.timeStream,
        abi: ABIS.timeStream,
        functionName: 'startStream',
        args: [merchant, cap, CURRENCY_TYPE[currency], '0x'],
      });
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: ABIS.timeStream,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'StreamStarted') {
            return (decoded.args as unknown as { sessionId: Hex }).sessionId;
          }
        } catch {
          /* not our log */
        }
      }
      throw new Error('session_id_missing');
    },
    [address, ensureApproval, send],
  );

  /** Close a session; returns { totalPaid, refunded } from StreamSettled. */
  const stopStream = useCallback(
    async (sessionId: Hex) => {
      if (!CONTRACTS.timeStream) throw new Error('no_contract');
      const { receipt } = await send({
        address: CONTRACTS.timeStream,
        abi: ABIS.timeStream,
        functionName: 'stopStream',
        args: [sessionId],
      });
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: ABIS.timeStream,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'StreamSettled') {
            return decoded.args as unknown as {
              totalPaid: bigint;
              refunded: bigint;
              durationSeconds: bigint;
            };
          }
        } catch {
          /* not our log */
        }
      }
      return null;
    },
    [send],
  );

  /** Local accrued calc — same formula as the contract view. */
  const accrued = useCallback(
    (s: ChainSession, now = Date.now()): number => {
      const end = !s.active && s.stopTime ? s.stopTime : now;
      return Math.min(
        Math.max(0, (end - s.startTime) / 1000) * s.ratePerSecond,
        s.maxCap,
      );
    },
    [],
  );

  return {
    onChain,
    address,
    merchantProfile,
    getSession,
    myActiveSession,
    merchantSessions,
    setRate,
    setQrEnabled,
    startStream,
    stopStream,
    accrued,
    STREAM_STARTED_SIG,
    STREAM_SETTLED_SIG,
  };
}
