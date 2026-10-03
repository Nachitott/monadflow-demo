'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { Play, Store } from 'lucide-react';
import {
  accruedAmount,
  fetchMyActiveSession,
  type StreamSession,
} from '@/lib/api';
import { formatDuration } from '@/lib/useTimeStreamTimer';
import { formatAmount } from '@/lib/useExchangeRate';

/**
 * Persistent home indicator: if the signed-in user has an open
 * consumption, keep it visible (and ticking) no matter where they
 * navigated. Polls the shared store every 2s.
 */
export default function ActiveSessionBanner() {
  const { ready, authenticated, user } = usePrivy();
  const [session, setSession] = useState<StreamSession | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!ready || !authenticated || !user?.id) return;
    const load = () => fetchMyActiveSession(user.id).then(setSession);
    load();
    const id = setInterval(() => {
      load();
      setTick((t) => t + 1);
    }, 2_000);
    return () => clearInterval(id);
  }, [ready, authenticated, user?.id]);

  if (!session) return null;

  return (
    <Link
      href="/consumo"
      className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/50 bg-emerald-950/60 px-4 py-3 transition hover:border-emerald-400"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <div>
          <p className="text-xs font-medium text-emerald-300">
            Consumo en curso
          </p>
          <p className="flex items-center gap-1 text-[11px] text-slate-400">
            <Store className="h-3 w-3" />
            {session.merchantName} · {formatDuration((Date.now() - session.startTime) / 1000)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-emerald-300">
          {formatAmount(accruedAmount(session), session.currency)}
        </span>
        <Play className="h-4 w-4 text-emerald-400" />
      </div>
    </Link>
  );
}
