'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowDownLeft, Loader2, QrCode, ShieldCheck } from 'lucide-react';
import BalanceCard from '@/components/BalanceCard';
import FiatRampModal from '@/components/FiatRampModal';
import HeaderUserBar from '@/components/HeaderUserBar';
import LoginScreen from '@/components/LoginScreen';
import { useBalances } from '@/lib/BalanceContext';
import { useExchangeRate, formatAmount, type Currency } from '@/lib/useExchangeRate';

export default function Home() {
  const { ready, authenticated } = usePrivy();
  const { rate, updatedAt } = useExchangeRate();
  const { balances, updateBalance } = useBalances();
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [rampOpen, setRampOpen] = useState(false);

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

  const handleDeposit = (amount: number, depositCurrency: Currency) => {
    updateBalance(amount, depositCurrency);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col">
      <HeaderUserBar />
      <section className="flex flex-1 flex-col gap-4 p-4">
        <BalanceCard
          balanceARS={balances.ARS}
          balanceUSD={balances.USD}
          activeCurrency={currency}
          onCurrencyToggle={setCurrency}
        />

        <p className="text-right font-mono text-xs text-slate-500">
          1 USD ≈ {formatAmount(rate, 'ARS')}
          {updatedAt &&
            ` · actualizado ${updatedAt.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
            })}`}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <button className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-500/50">
            <QrCode className="h-7 w-7 text-emerald-400" />
            <span className="text-sm font-medium">Pagar por tiempo</span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-500/50">
            <ShieldCheck className="h-7 w-7 text-cyan-400" />
            <span className="text-sm font-medium">Proyectos por etapas</span>
          </button>
        </div>
      </section>

      <button
        onClick={() => setRampOpen(true)}
        className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500"
      >
        <ArrowDownLeft className="h-5 w-5" />
        Cargar saldo
      </button>

      <FiatRampModal
        isOpen={rampOpen}
        onClose={() => setRampOpen(false)}
        onDepositSuccess={handleDeposit}
      />
    </main>
  );
}
