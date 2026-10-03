'use client';

import { Timer } from 'lucide-react';
import { useTimeStreamTimer, formatDuration } from '@/lib/useTimeStreamTimer';
import { formatAmount, type Currency } from '@/lib/useExchangeRate';

interface Props {
  sessionId: string;
  ratePerSecond: number;
  maxCap: number;
  startTime: number;
  currency: Currency;
}

export default function LiveStreamTimer({
  ratePerSecond,
  maxCap,
  startTime,
  currency,
}: Props) {
  const { elapsedSeconds, accrued, capReached, capProgress } =
    useTimeStreamTimer(startTime, ratePerSecond, maxCap);

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-slate-900 p-6">
      <div className="flex items-center justify-center gap-2 text-emerald-400">
        <Timer className="h-5 w-5 animate-pulse" />
        <span className="text-xs uppercase tracking-widest">Consumo en curso</span>
      </div>

      <p className="mt-4 text-center font-mono text-5xl font-semibold tabular-nums text-slate-100">
        {formatDuration(elapsedSeconds)}
      </p>

      <p className="mt-2 text-center font-mono text-2xl text-emerald-300">
        {formatAmount(accrued, currency)}
      </p>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Tope máximo</span>
          <span className={capReached ? 'font-semibold text-amber-400' : ''}>
            {formatAmount(maxCap, currency)}
            {capReached && ' · alcanzado'}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              capProgress > 0.85 ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(capProgress * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
