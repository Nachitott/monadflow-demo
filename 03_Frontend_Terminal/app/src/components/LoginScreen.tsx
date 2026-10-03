'use client';

import { useLogin } from '@privy-io/react-auth';
import { Fingerprint, Chrome, Apple, Waves } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useLogin();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex items-center gap-2 text-indigo-400">
        <Waves className="h-8 w-8" />
        <span className="text-2xl font-bold tracking-tight">MonadFlow</span>
      </div>
      <p className="mt-3 max-w-xs text-center text-sm text-slate-400">
        Pagos por tiempo y garantías protegidas. Simple, rápido y sin complicaciones.
      </p>

      <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={login}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-500"
        >
          <Chrome className="h-5 w-5" />
          Continuar con Google
        </button>
        <button
          onClick={login}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 font-medium text-slate-100 transition hover:bg-slate-700"
        >
          <Apple className="h-5 w-5" />
          Continuar con Apple
        </button>
        <button
          onClick={login}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 py-3 font-medium text-slate-300 transition hover:border-slate-500"
        >
          <Fingerprint className="h-5 w-5" />
          Usar Passkey
        </button>
      </div>
    </main>
  );
}
