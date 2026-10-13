'use client';

import { useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { CHAIN_ENABLED } from '../chainMode';
import { getEmbeddedAddress } from '../contracts';

/**
 * Silent gas top-up: fires once per session when the user's embedded
 * wallet exists. /api/gas no-ops without a funder key, so this is safe
 * to mount anywhere — the user never sees anything.
 */
export function useGasFaucet() {
  const { authenticated, user } = usePrivy();
  const fired = useRef(false);

  useEffect(() => {
    if (!CHAIN_ENABLED || fired.current || !authenticated) return;
    const address = getEmbeddedAddress(user);
    if (!address) return;
    fired.current = true;
    fetch('/api/gas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    }).catch(() => {});
  }, [authenticated, user]);
}
