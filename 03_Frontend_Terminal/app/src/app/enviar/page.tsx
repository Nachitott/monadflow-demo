'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowLeft, HandCoins, Loader2, Send } from 'lucide-react';
import MyReceiveQR from '@/components/p2p/MyReceiveQR';
import SendMoneyForm from '@/components/p2p/SendMoneyForm';
import TransferHistoryList from '@/components/p2p/TransferHistoryList';
import TransferReceipt from '@/components/p2p/TransferReceipt';
import type { Transfer } from '@/lib/api';

type Tab = 'send' | 'receive';
type View = 'form' | 'receipt';

function EnviarContent() {
  const { ready, authenticated } = usePrivy();
  const params = useSearchParams();
  const initialAlias = params.get('to') ?? undefined;
  const [tab, setTab] = useState<Tab>('send');
  const [view, setView] = useState<View>('form');
  const [receipt, setReceipt] = useState<Transfer | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </main>
    );
  }
  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-slate-400">
        Iniciá sesión para enviar dinero.
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-4">
      <header className="flex items-center gap-3 py-2">
        <Link href="/" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-slate-100">Enviar y recibir</h1>
      </header>

      <div className="mt-3 grid grid-cols-2 rounded-xl border border-slate-800 p-1 text-sm font-medium">
        <button
          onClick={() => setTab('send')}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 transition ${
            tab === 'send' ? 'bg-indigo-600 text-white' : 'text-slate-400'
          }`}
        >
          <Send className="h-4 w-4" /> Enviar
        </button>
        <button
          onClick={() => setTab('receive')}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 transition ${
            tab === 'receive' ? 'bg-indigo-600 text-white' : 'text-slate-400'
          }`}
        >
          <HandCoins className="h-4 w-4" /> Recibir
        </button>
      </div>

      <section className="mt-4 flex flex-1 flex-col gap-4">
        {tab === 'receive' ? (
          <MyReceiveQR />
        ) : view === 'receipt' && receipt ? (
          <TransferReceipt
            transfer={receipt}
            onDone={() => {
              setReceipt(null);
              setView('form');
            }}
          />
        ) : (
          <>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <SendMoneyForm
                initialAlias={initialAlias}
                onSent={(t) => {
                  setReceipt(t);
                  setView('receipt');
                  setError(null);
                }}
                onError={setError}
              />
            </div>
            {error && (
              <p className="rounded-xl border border-rose-800/50 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Movimientos recientes
              </p>
              <TransferHistoryList />
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function EnviarPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </main>
      }
    >
      <EnviarContent />
    </Suspense>
  );
}
