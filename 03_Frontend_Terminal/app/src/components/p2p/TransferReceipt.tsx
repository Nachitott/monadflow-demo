'use client';

import { CheckCircle2 } from 'lucide-react';
import { formatAmount } from '@/lib/useExchangeRate';
import type { Transfer } from '@/lib/api';

interface Props {
  transfer: Transfer;
  onDone: () => void;
}

export default function TransferReceipt({ transfer, onDone }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-700/40 bg-emerald-950/30 p-6 text-center">
      <CheckCircle2 className="h-12 w-12 text-emerald-400" />
      <div>
        <p className="text-lg font-semibold text-slate-100">Envío realizado</p>
        <p className="mt-1 font-mono text-2xl font-semibold text-emerald-300">
          {formatAmount(transfer.amount, transfer.currency)}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Para <b className="text-slate-200">{transfer.to}</b>
        </p>
        {transfer.note && <p className="mt-1 text-xs text-slate-500">“{transfer.note}”</p>}
      </div>
      <p className="font-mono text-xs text-slate-500">
        Comprobante #{transfer.id}
      </p>
      <button
        onClick={onDone}
        className="w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
      >
        Listo
      </button>
    </div>
  );
}
