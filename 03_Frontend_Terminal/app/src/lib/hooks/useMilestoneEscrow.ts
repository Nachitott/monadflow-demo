'use client';

import { useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { decodeEventLog, zeroAddress, type Address, type Hex } from 'viem';
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
import type { Agreement } from '../api';

export type ChainProjectStatus = 'active' | 'completed' | 'cancelled' | 'disputed';
const PROJECT_STATUS: ChainProjectStatus[] = [
  'active',
  'completed',
  'cancelled',
  'disputed',
];

export interface ChainProject {
  id: Hex;
  client: Address;
  contractor: Address;
  agent: Address;
  /** Display units. */
  totalAmount: number;
  currency: Currency;
  totalStages: number;
  currentStage: number;
  autoReleaseSeconds: number;
  createdAt: number; // ms
  status: ChainProjectStatus;
}

export interface ChainMilestone {
  description: string;
  /** Display units. */
  amount: number;
  deliveredAt: number; // ms, 0 = not delivered
  approvedAt: number; // ms, 0 = not settled
}

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

/**
 * MilestoneEscrow wrapper. The contract has no pending/draft phase —
 * `createProject` (client-side call) escrows the full amount atomically.
 * Off-chain agreement records stay as the shareable draft/index and get
 * their `chainId` linked once the client deposits on-chain.
 */
export function useMilestoneEscrow() {
  const client = usePublicClient();
  const { user } = usePrivy();
  const { send, ensureApproval } = useContractTx();
  const address = getEmbeddedAddress(user);
  const onChain = CHAIN_ENABLED && chainReady;
  const escrow = CONTRACTS.milestoneEscrow;

  // ─── Reads ────────────────────────────────────────────────────────

  const getProject = useCallback(
    async (projectId: Hex): Promise<ChainProject | null> => {
      if (!client || !onChain || !escrow) return null;
      const p = (await client.readContract({
        address: escrow,
        abi: ABIS.milestoneEscrow,
        functionName: 'getProject',
        args: [projectId],
      })) as {
        id: Hex;
        client: Address;
        contractor: Address;
        agent: Address;
        totalAmount: bigint;
        currency: number;
        totalStages: number;
        currentStage: number;
        autoReleaseSeconds: number;
        createdAt: bigint;
        status: number;
      };
      if (!p.client || p.client === ZERO_ADDR) return null;
      const currency: Currency = p.currency === 1 ? 'USD' : 'ARS';
      return {
        id: p.id,
        client: p.client,
        contractor: p.contractor,
        agent: p.agent,
        totalAmount: fromUnits(p.totalAmount, currency),
        currency,
        totalStages: p.totalStages,
        currentStage: p.currentStage,
        autoReleaseSeconds: p.autoReleaseSeconds,
        createdAt: Number(p.createdAt) * 1000,
        status: PROJECT_STATUS[p.status] ?? 'active',
      };
    },
    [client, onChain, escrow],
  );

  /** Project + milestones with amounts converted to display units. */
  const getProjectView = useCallback(
    async (projectId: Hex) => {
      const p = await getProject(projectId);
      if (!p) return null;
      const raw = (await client!.readContract({
        address: escrow!,
        abi: ABIS.milestoneEscrow,
        functionName: 'getMilestones',
        args: [projectId],
      })) as Array<{
        description: string;
        amount: bigint;
        deliveredAt: bigint;
        approvedAt: bigint;
      }>;
      const milestones: ChainMilestone[] = raw.map((m) => ({
        description: m.description,
        amount: fromUnits(m.amount, p.currency),
        deliveredAt: Number(m.deliveredAt) * 1000,
        approvedAt: Number(m.approvedAt) * 1000,
      }));
      return { project: p, milestones };
    },
    [client, escrow, getProject],
  );

  // ─── Writes ───────────────────────────────────────────────────────

  /**
   * Client creates the project — approves the escrow for the full amount
   * then calls createProject (which pulls the 100% via transferFrom).
   * Returns the projectId parsed from the ProjectCreated event.
   */
  const createProject = useCallback(
    async (opts: {
      contractor: Address;
      stageCount: number;
      autoReleaseDays: number;
      currency: Currency;
      /** Display units — split evenly, remainder goes to the last stage. */
      totalAmount: number;
      title: string;
    }) => {
      if (!escrow || !address) throw new Error('no_contract');
      const total = toUnits(opts.totalAmount, opts.currency);
      const per = total / BigInt(opts.stageCount);
      const amounts = Array.from({ length: opts.stageCount }, (_, i) =>
        i === opts.stageCount - 1 ? total - per * BigInt(opts.stageCount - 1) : per,
      );
      const descriptions = amounts.map((_, i) => `Etapa ${i + 1}`);
      await ensureApproval(opts.currency, address, escrow, total);
      const { receipt } = await send({
        address: escrow,
        abi: ABIS.milestoneEscrow,
        functionName: 'createProject',
        args: [
          opts.contractor,
          zeroAddress, // no agent — disputes stay off-chain for now
          opts.stageCount,
          opts.autoReleaseDays,
          CURRENCY_TYPE[opts.currency],
          descriptions,
          amounts,
        ],
      });
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: ABIS.milestoneEscrow,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'ProjectCreated') {
            return (decoded.args as unknown as { projectId: Hex }).projectId;
          }
        } catch {
          /* not our log */
        }
      }
      throw new Error('project_id_missing');
    },
    [address, ensureApproval, escrow, send],
  );

  const stageAction = useCallback(
    async (
      fn: 'deliverStage' | 'approveStage' | 'claimAutoRelease' | 'cancelProject',
      projectId: Hex,
      stageIndex?: number,
    ) => {
      if (!escrow) throw new Error('no_contract');
      await send({
        address: escrow,
        abi: ABIS.milestoneEscrow,
        functionName: fn,
        args: stageIndex === undefined ? [projectId] : [projectId, stageIndex],
      });
    },
    [escrow, send],
  );

  const deliverStage = useCallback(
    (projectId: Hex, stageIndex: number) => stageAction('deliverStage', projectId, stageIndex),
    [stageAction],
  );
  const approveStage = useCallback(
    (projectId: Hex, stageIndex: number) => stageAction('approveStage', projectId, stageIndex),
    [stageAction],
  );
  const claimAutoRelease = useCallback(
    (projectId: Hex) => stageAction('claimAutoRelease', projectId),
    [stageAction],
  );
  const cancelProject = useCallback(
    (projectId: Hex) => stageAction('cancelProject', projectId),
    [stageAction],
  );

  return {
    onChain,
    address,
    getProject,
    getProjectView,
    createProject,
    deliverStage,
    approveStage,
    claimAutoRelease,
    cancelProject,
  };
}

/**
 * Merge a mock agreement record (title, names, link state) with on-chain
 * project state into the `Agreement` shape the existing UI consumes.
 * On-chain has no "luz verde" gate, so every unapproved stage reads as
 * authorized — sequential deliver/approve still enforced by the contract.
 */
export function mergeChainAgreement(
  meta: Agreement,
  p: ChainProject,
  ms: ChainMilestone[],
): Agreement {
  return {
    ...meta,
    chainId: p.id,
    status: p.status === 'disputed' ? 'active' : p.status,
    totalAmount: p.totalAmount,
    currency: p.currency,
    stageCount: p.totalStages,
    autoApproveDays: Math.round(p.autoReleaseSeconds / 86400),
    stages: ms.map((m) => ({
      approved: m.approvedAt > 0,
      deliveredAt: m.deliveredAt || undefined,
      paidAt: m.approvedAt || undefined,
      authorizedAt: 1,
    })),
  };
}
