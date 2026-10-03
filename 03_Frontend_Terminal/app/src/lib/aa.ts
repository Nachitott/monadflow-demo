/**
 * Account Abstraction (ERC-4337) configuration.
 *
 * Every user action is routed through a sponsoring paymaster so the
 * perceived cost is always $0, and session keys sign silently during
 * check-in / check-out flows. Nothing in this module is ever surfaced
 * to the UI — the chain stays invisible.
 */

export const ENTRYPOINT_V06 = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as const;

export const aaConfig = {
  entryPoint: ENTRYPOINT_V06,
  bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL ?? 'https://bundler.monad.xyz',
  paymasterUrl: process.env.NEXT_PUBLIC_PAYMASTER_URL ?? 'https://paymaster.monad.xyz',
  /**
   * Session key policy: silent signatures scoped to the business
   * contracts (TimeStream check-in/out, MilestoneEscrow approvals)
   * so users never see a signing prompt mid-session.
   */
  sessionKey: {
    enabled: true,
    // Max session duration for silent signing (24h covers a full workday).
    validitySeconds: 60 * 60 * 24,
  },
} as const;

export const isGaslessEnabled = Boolean(aaConfig.paymasterUrl);
