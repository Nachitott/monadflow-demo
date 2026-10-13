import { formatUnits, isAddress, parseUnits, type Address } from 'viem';
import MilestoneEscrowAbi from './abis/MilestoneEscrow.json';
import MockARSAbi from './abis/MockARS.json';
import MockExchangeAbi from './abis/MockExchange.json';
import MockUSDCAbi from './abis/MockUSDC.json';
import TimeStreamAbi from './abis/TimeStream.json';
import type { Currency } from './useExchangeRate';

/**
 * On-chain wiring for Monad Testnet. Addresses come from env (set after
 * Deploy.s.sol runs); every consumer must check `chainReady` before
 * assuming a contract exists — undefined means "not deployed yet".
 */

export const ABIS = {
  timeStream: TimeStreamAbi,
  milestoneEscrow: MilestoneEscrowAbi,
  mockUsdc: MockUSDCAbi,
  mockArs: MockARSAbi,
  mockExchange: MockExchangeAbi,
} as const;

const env = (v: string | undefined): Address | undefined =>
  v && isAddress(v) ? (v as Address) : undefined;

export const CONTRACTS = {
  timeStream: env(process.env.NEXT_PUBLIC_TIME_STREAM),
  milestoneEscrow: env(process.env.NEXT_PUBLIC_MILESTONE_ESCROW),
  mockUsdc: env(process.env.NEXT_PUBLIC_MOCK_USDC),
  mockArs: env(process.env.NEXT_PUBLIC_MOCK_ARS),
  mockExchange: env(process.env.NEXT_PUBLIC_MOCK_EXCHANGE),
} as const;

/** True when every contract the chain mode needs is configured. */
export const chainReady = Boolean(
  CONTRACTS.timeStream &&
    CONTRACTS.milestoneEscrow &&
    CONTRACTS.mockUsdc &&
    CONTRACTS.mockArs &&
    CONTRACTS.mockExchange,
);

// ─── Units ──────────────────────────────────────────────────────────
// Contracts use CurrencyType { ARS: 0, USD: 1 }. mARS has 18 decimals,
// mUSDC has 6 — never mix units with display values.

export const CURRENCY_TYPE: Record<Currency, 0 | 1> = { ARS: 0, USD: 1 };
export const DECIMALS: Record<Currency, number> = { ARS: 18, USD: 6 };

export const tokenOf = (c: Currency): Address | undefined =>
  c === 'USD' ? CONTRACTS.mockUsdc : CONTRACTS.mockArs;

/** Display amount (e.g. 5000 ARS) → base units (5000e18). */
export const toUnits = (amount: number, currency: Currency): bigint =>
  parseUnits(String(amount), DECIMALS[currency]);

/** Base units → display number. Loses precision beyond 2 decimals — fine for fiat UI. */
export const fromUnits = (units: bigint, currency: Currency): number =>
  Number(formatUnits(units, DECIMALS[currency]));

// ─── Identity ───────────────────────────────────────────────────────

interface PrivyUserLike {
  wallet?: { address?: string } | null;
  linkedAccounts?: Array<{ type?: string; address?: string }>;
}

/** The user's embedded wallet address — on-chain identity. Never render it. */
export const getEmbeddedAddress = (user: PrivyUserLike | null | undefined): Address | undefined => {
  const direct = user?.wallet?.address;
  if (direct && isAddress(direct)) return direct as Address;
  const embedded = user?.linkedAccounts?.find(
    (a) => a.type === 'wallet' && a.address && isAddress(a.address),
  );
  return embedded?.address ? (embedded.address as Address) : undefined;
};
