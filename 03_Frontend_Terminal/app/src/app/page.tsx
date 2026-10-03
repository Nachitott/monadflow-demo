'use client';

import { usePrivy } from '@privy-io/react-auth';
import { Loader2, QrCode, ShieldCheck } from 'lucide-react';
import HeaderUserBar from '@/components/HeaderUserBar';
import LoginScreen from '@/components/LoginScreen';

export default function Home() {
  const { ready, authenticated } = usePrivy();

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </main>
    );
  }

  if (!authenticated) {
    return <LoginScreen />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col">
      <HeaderUserBar />
      <section className="flex flex-1 flex-col gap-4 p-4">
        <div className="rounded-2xl bg-slate-900 p-6">
          <p className="text-xs uppercase tracking-wide text-slate-400">Saldo disponible</p>
          <p className="mt-2 font-mono text-4xl font-semibold text-slate-100">$ 0,00</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-500/50">
            <QrCode className="h-7 w-7 text-emerald-400" />
            <span className="text-sm font-medium">Pagar por tiempo</span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-500/50">
            <ShieldCheck className="h-7 w-7 text-cyan-400" />
            <span className="text-sm font-medium">Proyectos por etapas</span>
          </button>
        </div>
      </section>
    </main>
  );
}
