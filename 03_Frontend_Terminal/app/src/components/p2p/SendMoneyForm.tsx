'use client';

import { useEffect, useRef, useState } from 'react';
import { AtSign, CheckCircle2, Loader2, ScanLine, UserRound } from 'lucide-react';
import QRScanner from '@/components/stream/QRScanner';
import { useBalances } from '@/lib/BalanceContext';
import { useTransfers } from '@/lib/useTransfers';
import { formatAmount, type Currency } from '@/lib/useExchangeRate';
import type { Transfer } from '@/lib/api';

interface Props {
  initialAlias?: string;
  onSent: (t: Transfer) => void;
  onError: (msg: string) => void;
}

const QUICK_AMOUNTS = [1000, 5000, 10000];

const parseRecipient = (text: string): string | null => {
  try {
    const url = new URL(text);
    const to = url.searchParams.get('to');
    if (to) return to;
    const m = url.pathname.match(/\/enviar/);
    return m ? url.searchParams.get('to') : null;
  } catch {
    const raw = text.trim().toLowerCase();
    return /^[a-z0-9][a-z0-9._-]{2,24}$/.test(raw) ? raw : null;
  }
};

type Step = 'who' | 'howmuch';

export default function SendMoneyForm({ initialAlias, onSent, onError }: Props) {
  const { balances, refreshBalances } = useBalances();
  const { send, resolveAlias } = useTransfers();
  const [step, setStep] = useState<Step>('who');
  const [aliasInput, setAliasInput] = useState(initialAlias ?? '');
  const [recipient, setRecipient] = useState<{ alias: string; displayName: string } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  // Live alias resolution (debounced) — also runs for a scanned/deep-linked alias.
  useEffect(() => {
    const value = aliasInput.trim().toLowerCase();
    setRecipient(null);
    setNotFound(false);
    if (!value || value.length < 3) return;
    setResolving(true);
    debounce.current = setTimeout(async () => {
      const found = await resolveAlias(value);
      setResolving(false);
      if (found) setRecipient(found);
      else setNotFound(true);
    }, 400);
    return () => clearTimeout(debounce.current);
  }, [aliasInput, resolveAlias]);

  const amount = Number(amountInput);
  const validAmount = Number.isFinite(amount) && amount > 0;
  const enough = validAmount && amount <= balances[currency];

  const handleSend = async () => {
    if (!recipient || !enough || sending) return;
    setSending(true);
    const { transfer, error } = await send(recipient.alias, amount, currency, note || undefined);
    setSending(false);
    if (transfer) {
      refreshBalances();
      onSent(transfer);
    } else {
      onError(
        error === 'insufficient_funds'
          ? 'Saldo insuficiente para esa cartera.'
          : error === 'self_transfer'
            ? 'No podés enviarte dinero a vos mismo.'
            : 'No se pudo procesar la solicitud, intentá nuevamente.',
      );
    }
  };

  if (scanning) {
    return (
      <QRScanner
        parse={parseRecipient}
        onResult={(alias) => {
          setScanning(false);
          setAliasInput(alias);
        }}
        onCancel={() => setScanning(false)}
      />
    );
  }

  if (step === 'who') {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            ¿A quién le enviás?
          </label>
          <div className="relative mt-2">
            <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder="alias.mp o alias.cvu"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          {resolving && (
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Buscando…
            </p>
          )}
          {recipient && (
            <p className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-700/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
              <UserRound className="h-4 w-4" /> Para: <b>{recipient.displayName}</b>
            </p>
          )}
          {notFound && (
            <p className="mt-2 text-xs text-rose-400">
              Ese alias no existe. Revisá cómo está escrito.
            </p>
          )}
        </div>

        <button
          onClick={() => setScanning(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 py-3 text-sm text-slate-300 transition hover:border-indigo-500/50"
        >
          <ScanLine className="h-4 w-4 text-indigo-400" /> Escanear código de cobro
        </button>

        <button
          onClick={() => setStep('howmuch')}
          disabled={!recipient}
          className="rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {recipient && (
        <button
          onClick={() => setStep('who')}
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-left text-sm"
        >
          <UserRound className="h-4 w-4 text-indigo-400" />
          <span className="text-slate-300">
            Para: <b className="text-slate-100">{recipient.displayName}</b>
            <span className="ml-2 text-xs text-slate-500">{recipient.alias}</span>
          </span>
        </button>
      )}

      <div>
        <label className="text-xs uppercase tracking-wide text-slate-400">Monto</label>
        <div className="mt-2 flex gap-2">
          {(['ARS', 'USD'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${
                currency === c
                  ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                  : 'border-slate-700 text-slate-400'
              }`}
            >
              {c === 'ARS' ? 'Pesos (ARS)' : 'Dólares (USD)'}
            </button>
          ))}
        </div>
        <input
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))}
          inputMode="decimal"
          placeholder="0"
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-lg text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
        />
        <div className="mt-2 flex gap-2">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              onClick={() => setAmountInput(String(q))}
              className="flex-1 rounded-lg border border-slate-800 py-1.5 font-mono text-xs text-slate-400 transition hover:border-indigo-500/50"
            >
              {formatAmount(q, currency)}
            </button>
          ))}
        </div>
        <p className="mt-2 font-mono text-xs text-slate-500">
          Disponible: {formatAmount(balances[currency], currency)}
        </p>
        {validAmount && !enough && (
          <p className="mt-1 text-xs text-rose-400">
            Saldo insuficiente en {currency === 'ARS' ? 'pesos' : 'dólares'}.
          </p>
        )}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={120}
        placeholder="Nota (opcional) — ej: por la pizza"
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
      />

      <button
        onClick={handleSend}
        disabled={!enough || sending}
        className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" /> Enviar {validAmount ? formatAmount(amount, currency) : ''}
          </>
        )}
      </button>
    </div>
  );
}
