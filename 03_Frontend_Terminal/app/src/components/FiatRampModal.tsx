'use client';

import { useState } from 'react';
import { ArrowDownLeft, CheckCircle2, Landmark, Loader2, X } from 'lucide-react';
import { formatAmount, type Currency } from '@/lib/useExchangeRate';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDepositSuccess: (amount: number, currency: Currency) => void;
}

const QUICK_AMOUNTS = [5000, 10000, 25000];

export default function FiatRampModal({ isOpen, onClose, onDepositSuccess }: Props) {
  const [amountInput, setAmountInput] = useState('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [isProcessing, setIsProcessing] = useState(false);
  const [done, setDone] = useState(false);

  if (!isOpen) return null;

  const amount = Number(amountInput.replace(',', '.'));
  const valid = Number.isFinite(amount) && amount > 0;

  const handleDeposit = () => {
    if (!valid || isProcessing) return;
    setIsProcessing(true);
    // Simulated bank transfer latency.
    setTimeout(() => {
      setIsProcessing(false);
      setDone(true);
      onDepositSuccess(amount, currency);
      setTimeout(() => {
        setDone(false);
        setAmountInput('');
        onClose();
      }, 1200);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl border border-slate-800 bg-slate-900 p-6 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <Landmark className="h-5 w-5 text-indigo-400" />
            Cargar saldo
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1 text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-1 text-xs text-slate-400">
          Transferencia instantánea desde Mercado Pago o cualquier CVU.
        </p>

        <div className="mt-4 flex rounded-xl border border-slate-700 p-1 text-sm font-medium">
          {(['ARS', 'USD'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`flex-1 rounded-lg py-2 transition ${
                currency === c ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              {c === 'ARS' ? 'Pesos ($)' : 'Dólares (USD)'}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-xs uppercase tracking-wide text-slate-400">
          Monto a cargar
        </label>
        <div className="mt-1 flex items-center rounded-xl border border-slate-700 bg-slate-950 px-4 focus-within:border-indigo-500">
          <span className="font-mono text-lg text-slate-400">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.,]/g, ''))}
            placeholder="0,00"
            className="w-full bg-transparent px-2 py-3 font-mono text-lg outline-none placeholder:text-slate-600"
          />
        </div>

        {currency === 'ARS' && (
          <div className="mt-2 flex gap-2">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                onClick={() => setAmountInput(String(q))}
                className="rounded-lg border border-slate-700 px-3 py-1 font-mono text-xs text-slate-300 transition hover:border-indigo-500"
              >
                {formatAmount(q, 'ARS')}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-xl border border-dashed border-slate-700 p-3 text-xs text-slate-400">
          <p className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
            Alias de destino: <span className="font-mono text-slate-200">monadflow.mp</span>
          </p>
          <p className="mt-1">Acreditación inmediata una vez confirmada la transferencia.</p>
        </div>

        <button
          onClick={handleDeposit}
          disabled={!valid || isProcessing}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-medium text-white transition enabled:hover:bg-indigo-500 disabled:opacity-40"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Procesando…
            </>
          ) : done ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              ¡Saldo acreditado!
            </>
          ) : (
            'Confirmar carga'
          )}
        </button>
      </div>
    </div>
  );
}
