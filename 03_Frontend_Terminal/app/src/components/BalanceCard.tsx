'use client';

import Link from 'next/link';
import { ArrowDownLeft, Send } from 'lucide-react';
import { formatAmount, type Currency } from '@/lib/useExchangeRate';
import { useTransfers } from '@/lib/useTransfers';

interface Props {
  balanceARS: number;
  balanceUSD: number;
  activeCurrency: Currency;
  onCurrencyToggle: (currency: Currency) => void;
  /** Opens the fiat top-up modal (Mercado Pago / CVU simulation). */
  onTopUp: () => void;
}

export default function BalanceCard({
  balanceARS,
  balanceUSD,
  activeCurrency,
  onCurrencyToggle,
  onTopUp,
}: Props) {
  const { myAlias } = useTransfers();
  const display =
    activeCurrency === 'ARS' ? formatAmount(balanceARS, 'ARS') : formatAmount(balanceUSD, 'USD');

  return (
    <div className="rounded-2xl bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-400">Saldo disponible</p>
        <div className="flex rounded-full border border-slate-700 p-0.5 text-xs font-medium">
          {(['ARS', 'USD'] as const).map((c) => (
            <button
              key={c}
              onClick={() => onCurrencyToggle(c)}
              className={`rounded-full px-3 py-1 transition ${
                activeCurrency === c
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {c === 'ARS' ? '$ ARS' : 'USD'}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-slate-100">
        {display}
      </p>
      <p className="mt-1 font-mono text-xs text-slate-500">
        ≈ {activeCurrency === 'ARS' ? formatAmount(balanceUSD, 'USD') : formatAmount(balanceARS, 'ARS')}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Alias:{' '}
          <Link
            href="/enviar?tab=receive"
            className="font-mono text-indigo-300 transition hover:text-indigo-200"
          >
            {myAlias ? myAlias.alias : 'Creá tu alias →'}
          </Link>
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href="/enviar"
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          <Send className="h-4 w-4" /> Transferir
        </Link>
        <button
          onClick={onTopUp}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-200 transition hover:border-indigo-500 hover:text-white"
        >
          <ArrowDownLeft className="h-4 w-4" /> Cargar saldo
        </button>
      </div>
    </div>
  );
}
