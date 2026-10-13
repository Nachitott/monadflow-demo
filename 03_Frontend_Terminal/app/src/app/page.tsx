'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Loader2 } from 'lucide-react';
import ActivityList from '@/components/ActivityList';
import ActiveSessionBanner from '@/components/stream/ActiveSessionBanner';
import BalanceCard from '@/components/BalanceCard';
import BottomNav from '@/components/BottomNav';
import FiatRampModal from '@/components/FiatRampModal';
import HeaderUserBar from '@/components/HeaderUserBar';
import LoginScreen from '@/components/LoginScreen';
import { useBalances } from '@/lib/BalanceContext';
import { CHAIN_ENABLED } from '@/lib/chainMode';
import { ABIS, chainReady, tokenOf, toUnits } from '@/lib/contracts';
import { useContractTx } from '@/lib/hooks/useContractTx';
import { useDualWallet } from '@/lib/hooks/useDualWallet';
import { useGasFaucet } from '@/lib/hooks/useGasFaucet';
import { useExchangeRate, formatAmount, type Currency } from '@/lib/useExchangeRate';

export default function Home() {
  const { ready, authenticated } = usePrivy();
  const { rate, updatedAt } = useExchangeRate();
  const { balances, updateBalance, refreshBalances } = useBalances();
  const { send } = useContractTx();
  const { address } = useDualWallet();
  useGasFaucet();
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [rampOpen, setRampOpen] = useState(false);
  const [activityKey, setActivityKey] = useState(0);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </main>
    );
  }

  if (!authenticated) {
    return <LoginScreen />;
  }

  const handleDeposit = async (amount: number, depositCurrency: Currency) => {
    if (CHAIN_ENABLED && chainReady && address) {
      // Mock tokens mint publicly (demo faucet) — "cargar saldo" credits
      // the user's embedded wallet directly on-chain.
      try {
        await send({
          address: tokenOf(depositCurrency)!,
          abi: depositCurrency === 'USD' ? ABIS.mockUsdc : ABIS.mockArs,
          functionName: 'mint',
          args: [address, toUnits(amount, depositCurrency)],
        });
        // Keep the KV copy + activity log in sync — it feeds the history
        // feed and the mock fallback if the flag flips back.
        updateBalance(amount, depositCurrency, 'deposit');
        refreshBalances();
        setActivityKey((k) => k + 1);
      } catch {
        // Silent — the modal already showed the failure state.
      }
      return;
    }
    updateBalance(amount, depositCurrency, 'deposit');
    setActivityKey((k) => k + 1);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col">
      <HeaderUserBar />
      <section className="flex flex-1 flex-col gap-4 p-4 pb-28">
        <BalanceCard
          balanceARS={balances.ARS}
          balanceUSD={balances.USD}
          activeCurrency={currency}
          onCurrencyToggle={setCurrency}
          onTopUp={() => setRampOpen(true)}
        />

        <p className="text-right font-mono text-xs text-slate-500">
          1 USD ≈ {formatAmount(rate, 'ARS')}
          {updatedAt &&
            ` · actualizado ${updatedAt.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
            })}`}
        </p>

        <ActiveSessionBanner />

        <div>
          <h2 className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            Historial de transacciones
          </h2>
          <ActivityList refreshKey={activityKey} />
        </div>
      </section>

      <BottomNav />

      <FiatRampModal
        isOpen={rampOpen}
        onClose={() => setRampOpen(false)}
        onDepositSuccess={handleDeposit}
      />
    </main>
  );
}
