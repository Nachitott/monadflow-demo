/**
 * Feature flag: when on, money moves on Monad Testnet contracts; when off,
 * the app runs on the mock KV layer (demo fallback). Set via
 * NEXT_PUBLIC_CHAIN_ENABLED=1 — a single env var flips the whole app back.
 */
export const CHAIN_ENABLED = process.env.NEXT_PUBLIC_CHAIN_ENABLED === '1';
