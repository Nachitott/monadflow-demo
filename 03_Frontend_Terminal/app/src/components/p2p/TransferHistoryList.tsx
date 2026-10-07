'use client';

import { ArrowDownLeft, ArrowUpRight, Inbox } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { formatAmount } from '@/lib/useExchangeRate';
import { useTransfers } from '@/lib/useTransfers';

export default function TransferHistoryList() {
  const { user } = usePrivy();
  const { history } = useTransfers();

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-800 p-6 text-center">
        <Inbox className="h-6 w-6 text-slate-600" />
        <p className="text-xs text-slate-500">Todavía no tenés movimientos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {history.map((t) => {
        const sent = t.from === user?.id;
        return (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full p-1.5 ${
                  sent ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'
                }`}
              >
                {sent ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
              </span>
              <div>
                <p className="text-sm text-slate-200">
                  {sent ? `Para ${t.to}` : `De ${t.fromName}`}
                </p>
                <p className="font-mono text-[10px] text-slate-500">
                  #{t.id} ·{' '}
                  {new Date(t.createdAt).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {t.note ? ` · ${t.note}` : ''}
                </p>
              </div>
            </div>
            <p
              className={`font-mono text-sm font-semibold ${
                sent ? 'text-rose-300' : 'text-emerald-300'
              }`}
            >
              {sent ? '−' : '+'}
              {formatAmount(t.amount, t.currency)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
