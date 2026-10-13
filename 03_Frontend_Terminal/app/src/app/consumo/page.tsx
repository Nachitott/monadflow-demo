'use client';

import { Suspense, useEffect, useState } from 'react';
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
import { isAddress, type Address, type Hex } from 'viem';
import LiveStreamTimer from '@/components/stream/LiveStreamTimer';
import QRScanner from '@/components/stream/QRScanner';
import StreamSummaryCard from '@/components/stream/StreamSummaryCard';
import { useBalances } from '@/lib/BalanceContext';
import { CHAIN_ENABLED } from '@/lib/chainMode';
import { chainReady } from '@/lib/contracts';
import {
  useMonadStream,
  type ChainMerchant,
  type ChainSession,
} from '@/lib/hooks/useMonadStream';
import { reportActivity } from '@/lib/activityReport';
import {
  accruedAmount,
  closeSession,
  createSession,
  fetchMerchant,
  fetchMyActiveSession,
  fetchSession,
  type Merchant,
  type StreamSession,
} from '@/lib/api';
import { formatAmount, type Currency } from '@/lib/useExchangeRate';

const QUICK_CAPS = [3000, 5000, 10000];

type Step = 'scan' | 'cap' | 'active' | 'summary';

/** Unified session shape for the timer/summary UI (display units). */
interface ActiveSession {
  id: string;
  merchantName: string;
  ratePerSecond: number;
  maxCap: number;
  startTime: number;
  currency: Currency;
}

const toActive = (s: StreamSession | ChainSession, name: string): ActiveSession => ({
  id: s.id,
  merchantName: 'merchantName' in s ? s.merchantName : name,
  ratePerSecond: s.ratePerSecond,
  maxCap: s.maxCap,
  startTime: s.startTime,
  currency: s.currency,
});

function ConsumoContent() {
  const { ready, authenticated, user } = usePrivy();
  const params = useSearchParams();
  const { balances, updateBalance } = useBalances();
  const stream = useMonadStream();
  const onChain = CHAIN_ENABLED && chainReady;
  // Mock QR carries ?m=qr-xxx; on-chain QR carries the merchant address.
  const scannedCode = params.get('m');
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [chainMerchant, setChainMerchant] = useState<ChainMerchant | null>(null);
  const [step, setStep] = useState<Step>(() => (scannedCode ? 'cap' : 'scan'));
  const [scanning, setScanning] = useState(false);
  const [capInput, setCapInput] = useState('5000');
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [chainSession, setChainSession] = useState<ChainSession | null>(null);
  const [finish, setFinish] = useState<{ paid: number; refunded: number; secs: number } | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  const currency: Currency = onChain
    ? (chainMerchant?.currency ?? 'ARS')
    : 'ARS';
  const balance = currency === 'USD' ? balances.USD : balances.ARS;

  // Resolve merchant once authenticated (direct QR link or manual scan).
  useEffect(() => {
    if (!ready || !authenticated) return;
    if (onChain) {
      if (!scannedCode || !isAddress(scannedCode) || chainMerchant) return;
      stream.merchantProfile(scannedCode as Address).then((p) => {
        if (!p || p.disabled || p.ratePerSecond === 0) {
          setBlocked(true);
          setStep('scan');
        } else {
          setChainMerchant(p);
        }
      });
      return;
    }
    if (merchant) return;
    fetchMerchant().then((m) => {
      setMerchant(m);
      if (scannedCode && (m.qrId !== scannedCode || !m.active)) {
        setBlocked(true);
        setStep('scan');
      }
    });
  }, [ready, authenticated, merchant, chainMerchant, scannedCode, onChain, stream]);

  // If this user already has an open consumption (e.g. they navigated
  // away or re-scanned the QR), resume it instead of starting a new one.
  useEffect(() => {
    if (!ready || !authenticated || !user?.id) return;
    if (onChain) {
      stream.myActiveSession().then((s) => {
        if (s) {
          setChainSession(s);
          setSession(toActive(s, 'Comercio'));
          setStep('active');
        }
      });
      return;
    }
    fetchMyActiveSession(user.id).then((s) => {
      if (s) {
        setSession(toActive(s, s.merchantName));
        setStep('active');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, user?.id]);

  // Poll the session so a merchant-side stop settles the UI too.
  useEffect(() => {
    if (step !== 'active' || !session) return;
    const id = setInterval(async () => {
      if (onChain && chainSession) {
        const s = await stream.getSession(chainSession.id);
        if (s && !s.active) finishChain(s);
        return;
      }
      const s = await fetchSession(session.id);
      if (s?.ended) handleFinish();
    }, 3_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, session, chainSession, onChain]);

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
  const enoughBalance = balance >= cap;

  const merchantName = onChain ? 'Comercio' : (merchant?.name ?? 'Comercio');
  const merchantRate = onChain
    ? (chainMerchant?.ratePerSecond ?? 0)
    : (merchant?.ratePerMinute ?? 0) / 60;

  const resolveMerchant = async (code: string | null) => {
    setScanning(false);
    if (onChain) {
      const addr = code && isAddress(code) ? (code as Address) : null;
      const p = addr ? await stream.merchantProfile(addr) : null;
      if (!p || p.disabled || p.ratePerSecond === 0) setBlocked(true);
      else {
        setChainMerchant(p);
        setStep('cap');
      }
      return;
    }
    const m = await fetchMerchant();
    setMerchant(m);
    if (!m.active || (code && m.qrId !== code)) setBlocked(true);
    else setStep('cap');
  };

  const handleScanResult = (code: string) => resolveMerchant(code);
  const handleManualEntry = () => resolveMerchant(null);

  const handleStart = async () => {
    if (!capValid || !enoughBalance || busy) return;
    if (onChain) {
      if (!chainMerchant) return;
      setBusy(true);
      try {
        const id = await stream.startStream(chainMerchant.address, cap, currency);
        const s = await stream.getSession(id);
        if (s) {
          setChainSession(s);
          setSession(toActive(s, merchantName));
          setStep('active');
        }
      } catch {
        setBlocked(true);
      } finally {
        setBusy(false);
      }
      return;
    }
    const { session: s, resumed } = await createSession({
      userId: user?.id ?? 'anon',
      userName:
        user?.google?.name ?? user?.apple?.email ?? user?.email?.address ?? 'Cliente',
      currency: 'ARS',
      maxCap: cap,
    });
    // Hold the full cap only on a fresh session — a resumed one already
    // had its cap deducted when it was created.
    if (!resumed) updateBalance(-cap, 'ARS');
    setSession(toActive(s, s.merchantName));
    setStep('active');
  };

  const reportChainCharge = (s: ChainSession, paid: number) => {
    if (!user?.id || paid <= 0) return;
    reportActivity({
      userId: user.id,
      kind: 'consumo',
      amount: paid,
      currency: s.currency,
      label: merchantName,
      dedupeKey: `stream:${s.id}`,
      at: s.stopTime || Date.now(),
    });
  };

  const finishChain = (s: ChainSession) => {
    const secs = ((s.stopTime || Date.now()) - s.startTime) / 1000;
    const paid = s.totalPaid > 0 ? s.totalPaid : stream.accrued(s);
    reportChainCharge(s, paid);
    setFinish({ paid, refunded: s.maxCap - paid, secs });
    setStep('summary');
  };

  const handleFinish = async () => {
    if (!session || busy) return;
    if (onChain && chainSession) {
      setBusy(true);
      try {
        const settled = await stream.stopStream(chainSession.id);
        const paid = settled
          ? Number(settled.totalPaid) / 10 ** (currency === 'USD' ? 6 : 18)
          : stream.accrued(chainSession);
        const secs = (Date.now() - chainSession.startTime) / 1000;
        reportChainCharge(chainSession, paid);
        setFinish({ paid, refunded: session.maxCap - paid, secs });
      } catch {
        const paid = stream.accrued(chainSession);
        const secs = (Date.now() - chainSession.startTime) / 1000;
        reportChainCharge(chainSession, paid);
        setFinish({ paid, refunded: session.maxCap - paid, secs });
      } finally {
        setBusy(false);
      }
      setStep('summary');
      return;
    }
    const paid = Math.min(
      ((Date.now() - session.startTime) / 1000) * session.ratePerSecond,
      session.maxCap,
    );
    const secs = (Date.now() - session.startTime) / 1000;
    const refunded = session.maxCap - paid;
    closeSession(session.id, paid);
    updateBalance(refunded, session.currency);
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

      {step === 'cap' && (onChain ? chainMerchant : merchant) && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-900 p-4">
            <QrCode className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="font-semibold">{merchantName}</p>
              <p className="font-mono text-xs text-slate-400">
                {formatAmount(merchantRate * 3600, currency)} por hora
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
          <div className="flex flex-wrap gap-2">
            {QUICK_CAPS.map((q) => (
              <button
                key={q}
                onClick={() => setCapInput(String(q))}
                className="rounded-lg border border-slate-700 px-3 py-1 font-mono text-xs text-slate-300 hover:border-emerald-500"
              >
                {formatAmount(q, currency)}
              </button>
            ))}
            <button
              onClick={() => setCapInput(String(Math.floor(balance)))}
              className="rounded-lg border border-indigo-600 px-3 py-1 font-mono text-xs text-indigo-300 hover:border-indigo-400"
            >
              Usar todo mi saldo
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Escribí cualquier monto: se reserva de tu saldo ({formatAmount(balance, currency)}{' '}
            disponibles) y lo que no uses se devuelve automáticamente al finalizar.
          </p>
          {!enoughBalance && capValid && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              <p className="text-xs text-amber-300">
                Tu saldo no alcanza para ese tope.
              </p>
              <button
                onClick={() => setCapInput(String(Math.floor(balance)))}
                className="shrink-0 rounded-lg bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/30"
              >
                Ajustar a {formatAmount(Math.floor(balance), currency)}
              </button>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={!capValid || !enoughBalance || busy}
            className="sticky bottom-4 mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-medium text-white shadow-lg shadow-emerald-950/50 transition enabled:hover:bg-emerald-500 disabled:opacity-40"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
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
            {session.merchantName} · {formatAmount(session.ratePerSecond * 60, session.currency)}/min
          </p>
          <button
            onClick={handleFinish}
            disabled={busy}
            className="sticky bottom-4 mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 font-medium text-white shadow-lg shadow-rose-950/50 transition hover:bg-rose-500 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4 fill-current" />}
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

export default function ConsumoPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </main>
      }
    >
      <ConsumoContent />
    </Suspense>
  );
}
