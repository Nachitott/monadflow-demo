'use client';

import Link from 'next/link';
import { usePrivy, useLogout } from '@privy-io/react-auth';
import { CheckCircle2, LogOut, Store, Waves } from 'lucide-react';

export default function HeaderUserBar() {
  const { user } = usePrivy();
  const { logout } = useLogout();

  const displayName =
    user?.google?.name ?? user?.apple?.email ?? user?.email?.address ?? 'Mi cuenta';

  return (
    <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
      <div className="flex items-center gap-2 text-indigo-400">
        <Waves className="h-6 w-6" />
        <span className="font-bold">MonadFlow</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-slate-100">{displayName}</span>
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Sesión activa
          </span>
        </div>
        <Link
          href="/comercio"
          aria-label="Panel de comercio"
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        >
          <Store className="h-5 w-5" />
        </Link>
        <button
          onClick={logout}
          aria-label="Cerrar sesión"
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
