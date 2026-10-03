'use client';

import { useEffect, useState } from 'react';

const RATE_PER_SECOND = 38;
const CAP = 5000;

function formatClock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function formatARS(value: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value);
}

export default function LiveTimer() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const spent = Math.min(elapsed * RATE_PER_SECOND, CAP);
  const pct = Math.min((spent / CAP) * 100, 100);
  const hitCap = spent >= CAP;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 ring-glow">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">Gimnasio Norte · Sesión activa</p>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
          <span className="h-2 w-2 animate-pulse-slow rounded-full bg-emerald-400" />
          En curso
        </span>
      </div>

      <p className="mt-6 font-mono text-5xl font-semibold tabular-nums text-slate-50">
        {formatClock(elapsed)}
      </p>

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-400">Consumido</span>
          <span className="font-mono text-lg font-semibold tabular-nums text-emerald-400">
            $ {formatARS(spent)}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex items-baseline justify-between text-xs text-slate-500">
          <span>Tope que vos elegís</span>
          <span className="font-mono tabular-nums">$ {formatARS(CAP)}</span>
        </div>
      </div>

      <button
        type="button"
        className="mt-6 w-full rounded-xl bg-slate-800 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
      >
        Finalizar sesión
      </button>

      {hitCap && (
        <p className="mt-3 text-center text-xs text-amber-400">
          Llegaste al tope. Se cortó solo, no se te cobra de más.
        </p>
      )}
    </div>
  );
}