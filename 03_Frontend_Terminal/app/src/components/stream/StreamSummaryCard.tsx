'use client';

import { CheckCircle2 } from 'lucide-react';
import { formatDuration } from '@/lib/useTimeStreamTimer';
import { formatAmount, type Currency } from '@/lib/useExchangeRate';

interface Props {
  totalDurationSeconds: number;
  totalPaid: number;
  refundedAmount: number;
  currency: Currency;
  merchantName: string;
}

export default function StreamSummaryCard({
  totalDurationSeconds,
  totalPaid,
  refundedAmount,
  currency,
  merchantName,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-col items-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        <h3 className="mt-2 font-semibold">Consumo finalizado</h3>
        <p className="text-xs text-slate-400">{merchantName}</p>
      </div>

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-400">Tiempo total</dt>
          <dd className="font-mono">{formatDuration(totalDurationSeconds)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-400">Total cobrado</dt>
          <dd className="font-mono text-slate-100">{formatAmount(totalPaid, currency)}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-800 pt-2">
          <dt className="text-slate-400">Saldo no usado devuelto</dt>
          <dd className="font-mono text-emerald-400">
            +{formatAmount(refundedAmount, currency)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
