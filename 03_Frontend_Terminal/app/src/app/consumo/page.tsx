'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import {
  ArrowLeft,
  Ban,
  Loader2,
  QrCode,
  ScanLine,
  Square,
} from 'lucide-react';
import LiveStreamTimer from '@/components/stream/LiveStreamTimer';
import QRScanner from '@/components/stream/QRScanner';
import StreamSummaryCard from '@/components/stream/StreamSummaryCard';
import { useBalances } from '@/lib/BalanceContext';
import {
  accruedAmount,
  closeSession,
  createSession,
  fetchMerchant,
  fetchSession,
  type Merchant,
  type StreamSession,
} from '@/lib/api';
import { formatAmount } from '@/lib/useExchangeRate';

const QUICK_CAPS = [3000, 5000, 10000];

type Step = 'scan' | 'cap' | 'active' | 'summary';

export default function ConsumoPage() {
  const { ready, authenticated, user } = usePrivy();
  const params = useSearchParams();
  const { balances, updateBalance } = useBalances();
  // The QR deep link carries the merchant code (?m=qr-xxx). Scanning the
  // code resolves the same merchant the dashboard generated.
  const scannedCode = params.get('m');
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [step, setStep] = useState<Step>(() => (scannedCode ? 'cap' : 'scan'));
  const [scanning, setScanning] = useState(false);
  const [capInput, setCapInput] = useState('5000');
  const [session, setSession] = useState<StreamSession | null>(null);
  const [finish, setFinish] = useState<{ paid: number; refunded: number; secs: number } | null>(null);
  const [blocked, setBlocked] = useState(false);

  // Resolve merchant once authenticated (direct QR link or manual scan).
  useEffect(() => {
    if (!ready || !authenticated || merchant) return;
    fetchMerchant().then((m) => {
      setMerchant(m);
      if (scannedCode && (m.qrId !== scannedCode || !m.active)) {
        setBlocked(true);
        setStep('scan');
      }
    });
  }, [ready, authenticated, merchant, scannedCode]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </main>
    );
  }
  if (!authenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-300">Iniciá sesión para pagar por tiempo.</p>
        <Link href="/" className="text-indigo-400 underline">Volver al inicio</Link>
      </main>
    );
  }

  const cap = Number(capInput.replace(',', '.')) || 0;
  const capValid = cap > 0;
  const enoughBalance = balances.ARS >= cap;

  const resolveMerchant = async (code: string | null) => {
    const m = await fetchMerchant();
    setMerchant(m);
    setScanning(false);
    if (!m.active || (code && m.qrId !== code)) setBlocked(true);
    else setStep('cap');
  };

  const handleScanResult = (code: string) => resolveMerchant(code);
  const handleManualEntry = () => resolveMerchant(null);

  // If the merchant regenerates the QR, the server closes our session —
  // poll its state and finish locally, refunding the unused cap.
  useEffect(() => {
    if (step !== 'active' || !session) return;
    const id = setInterval(async () => {
      const s = await fetchSession(session.id);
      if (s?.ended) handleFinish();
    }, 2_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, session]);

  const handleStart = async () => {
    if (!capValid || !enoughBalance || !merchant) return;
    const s = await createSession({
      userName:
        user?.google?.name ?? user?.apple?.email ?? user?.email?.address ?? 'Cliente',
      currency: 'ARS',
      maxCap: cap,
    });
    // Hold the full cap — the unused part is refunded on checkout.
    updateBalance(-cap, 'ARS');
    setSession(s);
    setStep('active');
  };

  const handleFinish = () => {
    if (!session) return;
    const paid = accruedAmount(session);
    const secs = (Date.now() - session.startTime) / 1000;
    const refunded = session.maxCap - paid;
    closeSession(session.id, paid);
    updateBalance(refunded, 'ARS');
    setFinish({ paid, refunded, secs });
    setStep('summary');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-4">
      <Link href="/" className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>

      {step === 'scan' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <h1 className="text-xl font-semibold">Pagar por tiempo</h1>
          <p className="max-w-xs text-center text-sm text-slate-400">
            Apuntá al código del establecimiento para iniciar tu consumo.
          </p>
          {scanning ? (
            <QRScanner
              onResult={handleScanResult}
              onCancel={() => setScanning(false)}
            />
          ) : (
            <>
              <button
                onClick={() => setScanning(true)}
                className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-emerald-500/50 bg-slate-900 text-emerald-400 transition hover:border-emerald-400"
              >
                <ScanLine className="h-10 w-10" />
                <span className="text-xs font-medium">Escanear código</span>
              </button>
              <button
                onClick={handleManualEntry}
                className="text-xs text-slate-500 underline hover:text-slate-300"
              >
                Ingresar sin escanear (demo)
              </button>
            </>
          )}
          {blocked && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <Ban className="h-4 w-4" />
              Este código ya no está vigente — pedile al comercio el código actual.
            </div>
          )}
        </div>
      )}

      {step === 'cap' && merchant && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-900 p-4">
            <QrCode className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="font-semibold">{merchant.name}</p>
              <p className="font-mono text-xs text-slate-400">
                {formatAmount(merchant.ratePerMinute, 'ARS')} por minuto
              </p>
            </div>
          </div>

          <label className="text-xs uppercase tracking-wide text-slate-400">
            Tope máximo de gasto
          </label>
          <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-4 focus-within:border-emerald-500">
            <span className="font-mono text-lg text-slate-400">$</span>
            <input
              inputMode="decimal"
              value={capInput}
              onChange={(e) => setCapInput(e.target.value.replace(/[^0-9.,]/g, ''))}
              className="w-full bg-transparent px-2 py-3 font-mono text-lg outline-none"
            />
          </div>
          <div className="flex gap-2">
            {QUICK_CAPS.map((q) => (
              <button
                key={q}
                onClick={() => setCapInput(String(q))}
                className="rounded-lg border border-slate-700 px-3 py-1 font-mono text-xs text-slate-300 hover:border-emerald-500"
              >
                {formatAmount(q, 'ARS')}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Se reserva este monto de tu saldo ({formatAmount(balances.ARS, 'ARS')}{' '}
            disponibles) y lo que no uses se devuelve automáticamente al finalizar.
          </p>
          {!enoughBalance && capValid && (
            <p className="text-xs text-amber-400">
              Tu saldo no alcanza para ese tope — cargá saldo o bajá el límite.
            </p>
          )}

          <button
            onClick={handleStart}
            disabled={!capValid || !enoughBalance}
            className="mt-auto rounded-xl bg-emerald-600 py-3 font-medium text-white transition enabled:hover:bg-emerald-500 disabled:opacity-40"
          >
            Iniciar consumo
          </button>
        </div>
      )}

      {step === 'active' && session && (
        <div className="flex flex-1 flex-col gap-4">
          <LiveStreamTimer
            sessionId={session.id}
            ratePerSecond={session.ratePerSecond}
            maxCap={session.maxCap}
            startTime={session.startTime}
            currency={session.currency}
          />
          <p className="text-center text-xs text-slate-500">
            {session.merchantName} · {formatAmount(session.ratePerSecond * 60, 'ARS')}/min
          </p>
          <button
            onClick={handleFinish}
            className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 font-medium text-white transition hover:bg-rose-500"
          >
            <Square className="h-4 w-4 fill-current" />
            Finalizar consumo
          </button>
        </div>
      )}

      {step === 'summary' && finish && session && (
        <div className="flex flex-1 flex-col gap-4">
          <StreamSummaryCard
            totalDurationSeconds={finish.secs}
            totalPaid={finish.paid}
            refundedAmount={finish.refunded}
            currency={session.currency}
            merchantName={session.merchantName}
          />
          <Link
            href="/"
            className="rounded-xl border border-slate-700 py-3 text-center font-medium text-slate-200 hover:border-slate-500"
          >
            Volver al inicio
          </Link>
        </div>
      )}
    </main>
  );
}
