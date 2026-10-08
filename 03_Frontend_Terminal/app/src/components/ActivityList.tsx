'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import {
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  Inbox,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { fetchActivity, type ActivityItem } from '@/lib/api';
import { formatAmount } from '@/lib/useExchangeRate';

const MAX_ROWS = 10;

const titleOf = (item: ActivityItem): string => {
  switch (item.kind) {
    case 'deposit':
      return 'Carga de saldo';
    case 'transfer_sent':
      return `Para ${item.label}`;
    case 'transfer_received':
      return `De ${item.label}`;
    case 'consumo':
      return `Pago por tiempo · ${item.label}`;
    case 'escrow_deposit':
      return `Fondo protegido · ${item.label}`;
    case 'escrow_refund':
      return `Reembolso · ${item.label}`;
    // escrow_release / escrow_payment already carry "Etapa N · título".
    default:
      return item.label;
  }
};

const hrefOf = (item: ActivityItem): string | null => {
  if (item.kind === 'consumo') return '/consumo';
  if (item.kind.startsWith('escrow_')) return `/acuerdo/${item.refId}`;
  if (item.kind.startsWith('transfer_')) return '/enviar';
  return null;
};

const iconOf = (item: ActivityItem) => {
  switch (item.kind) {
    case 'deposit':
      return <HandCoins className="h-4 w-4" />;
    case 'consumo':
      return <Timer className="h-4 w-4" />;
    case 'transfer_sent':
      return <ArrowUpRight className="h-4 w-4" />;
    case 'transfer_received':
      return <ArrowDownLeft className="h-4 w-4" />;
    default:
      return <ShieldCheck className="h-4 w-4" />;
  }
};

export default function ActivityList({ refreshKey = 0 }: { refreshKey?: number }) {
  const { user } = usePrivy();
  const [items, setItems] = useState<ActivityItem[]>([]);

  const load = useCallback(() => {
    if (!user?.id) return;
    fetchActivity(user.id)
      .then(setItems)
      .catch(() => {});
  }, [user?.id]);

  useEffect(load, [load, refreshKey]);

  useEffect(() => {
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [load]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-800 p-6 text-center">
        <Inbox className="h-6 w-6 text-slate-600" />
        <p className="text-xs text-slate-500">Todavía no tenés movimientos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.slice(0, MAX_ROWS).map((item) => {
        const incoming = item.direction === 'in';
        const href = hrefOf(item);
        const row = (
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full p-1.5 ${
                  incoming
                    ? 'bg-emerald-950 text-emerald-400'
                    : 'bg-rose-950 text-rose-400'
                }`}
              >
                {iconOf(item)}
              </span>
              <div>
                <p className="text-sm text-slate-200">{titleOf(item)}</p>
                <p className="font-mono text-[10px] text-slate-500">
                  Comprobante #{item.refId} ·{' '}
                  {new Date(item.at).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <p
              className={`font-mono text-sm font-semibold tabular-nums ${
                incoming ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {incoming ? '+' : '−'}
              {formatAmount(item.amount, item.currency)}
            </p>
          </div>
        );
        return href ? (
          <Link key={item.id} href={href} className="transition hover:brightness-125">
            {row}
          </Link>
        ) : (
          <div key={item.id}>{row}</div>
        );
      })}
    </div>
  );
}
