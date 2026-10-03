'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { wagmiConfig } from '@/lib/wagmi';
import { BalanceProvider } from '@/lib/BalanceContext';
import { monadTestnet } from '@/lib/chains';

// Public client ID — safe to embed; env var overrides it if set.
const PRIVY_APP_ID =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? 'cmushdamr01980did8zgf3lcq';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Social-first login: no connection modals, no seed phrases.
        loginMethods: ['google', 'apple', 'email'],
        appearance: {
          theme: 'dark',
          accentColor: '#6366f1',
          logo: undefined,
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <BalanceProvider>{children}</BalanceProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
