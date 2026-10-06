'use client';

import { CheckCircle2, Circle, Clock, Lock, ShieldCheck } from 'lucide-react';
import type { Agreement } from '@/lib/api';
import { stageAmountOf } from '@/lib/api';
import { formatAmount } from '@/lib/useExchangeRate';

interface Props {
  agreement: Agreement;
}

/**
 * Progress visualizer for the milestone-lock flow: guarantee banner on
 * top, vertical list of stages with status badges.
 */
export default function MilestoneTracker({ agreement: a }: Props) {
  const stageAmt = stageAmountOf(a);
  const approved = a.stages.filter((s) => s.approved).length;

  const badge = (i: number) => {
    const s = a.stages[i];
    if (s.approved)
      return (
        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          <CheckCircle2 className="h-3 w-3" /> Completado
        </span>
      );
    if (s.deliveredAt)
      return (
        <span className="flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
          <Clock className="h-3 w-3" /> En revisión
        </span>
      );
    if (s.authorizedAt)
      return (
        <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
          <Lock className="h-3 w-3" /> Autorizada
        </span>
      );
    if (i === approved)
      return (
        <span className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-400">
          <Circle className="h-3 w-3" /> En proceso
        </span>
      );
    return (
      <span className="flex items-center gap-1 rounded-full bg-slate-700/40 px-2 py-0.5 text-[10px] font-medium text-slate-400">
        Pendiente
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2 rounded-xl bg-cyan-500/10 px-3 py-2 text-xs text-cyan-300">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        {a.status === 'completed'
          ? 'Acuerdo completado — todos los fondos fueron liberados.'
          : a.status === 'cancelled'
            ? 'Acuerdo cancelado — los fondos no aprobados fueron devueltos.'
            : a.status === 'active'
              ? `${formatAmount(a.stages.filter((s) => !s.approved).length * stageAmt, a.currency)} protegidos en el fondo de garantía.`
              : 'Esperando el depósito del 100% para iniciar el acuerdo.'}
      </div>

      <ul className="mt-3 space-y-2">
        {a.stages.map((s, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-xl border border-slate-800 px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-medium">Etapa {i + 1}</p>
              <p className="font-mono text-xs text-slate-400">
                {formatAmount(stageAmt, a.currency)}
              </p>
            </div>
            {badge(i)}
          </li>
        ))}
      </ul>
    </div>
  );
}
