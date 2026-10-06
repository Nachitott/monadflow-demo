'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileSignature,
  Hourglass,
  Loader2,
  PackageCheck,
  Power,
  PowerOff,
  QrCode,
  Trash2,
  X,
} from 'lucide-react';
import {
  agreementAction,
  createAgreement,
  fetchAgreements,
  stageAmountOf,
  type Agreement,
} from '@/lib/api';
import { formatAmount, type Currency } from '@/lib/useExchangeRate';

const STATUS_LABEL: Record<Agreement['status'], { text: string; cls: string }> = {
  pending: { text: 'Esperando depósito', cls: 'bg-amber-500/15 text-amber-400' },
  active: { text: 'En curso', cls: 'bg-cyan-500/15 text-cyan-400' },
  completed: { text: 'Completado', cls: 'bg-emerald-500/15 text-emerald-400' },
  cancelled: { text: 'Cancelado', cls: 'bg-slate-700/40 text-slate-400' },
};

type Tab = 'mine' | 'client';

export default function AcuerdoPage() {
  const { ready, authenticated, user } = usePrivy();
  const [tab, setTab] = useState<Tab>('mine');
  const [mine, setMine] = useState<Agreement[]>([]);
  const [asClient, setAsClient] = useState<Agreement[]>([]);
  const [creating, setCreating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [origin, setOrigin] = useState('');

  // wizard state
  const [title, setTitle] = useState('');
  const [total, setTotal] = useState('');
  const [stages, setStages] = useState('3');
  const [days, setDays] = useState('5');
  const [currency, setCurrency] = useState<Currency>('ARS');

  const contractorName =
    user?.google?.name ?? user?.apple?.email ?? user?.email?.address ?? 'Contratista';

  const reload = useCallback(async () => {
    if (!user?.id) return;
    const [m, c] = await Promise.all([
      fetchAgreements({ contractor: user.id }),
      fetchAgreements({ client: user.id }),
    ]);
    setMine(m);
    setAsClient(c);
    setOrigin(window.location.origin);
  }, [user?.id]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    reload();
    const id = setInterval(reload, 3_000);
    return () => clearInterval(id);
  }, [ready, authenticated, reload]);

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
        <p className="text-slate-300">Iniciá sesión para crear acuerdos.</p>
        <Link href="/" className="text-indigo-400 underline">Volver al inicio</Link>
      </main>
    );
  }

  const totalNum = Number(total.replace(',', '.')) || 0;
  const stageNum = Math.floor(Number(stages)) || 0;
  const valid = title.trim().length > 0 && totalNum > 0 && stageNum >= 1 && stageNum <= 24;

  const submit = async () => {
    if (!valid) return;
    await createAgreement({
      title,
      totalAmount: totalNum,
      stageCount: stageNum,
      autoApproveDays: Math.max(0, Number(days) || 0),
      currency,
      contractorId: user?.id ?? 'anon',
      contractorName,
    });
    setTitle('');
    setTotal('');
    setCreating(false);
    reload();
  };

  const remove = async (a: Agreement) => {
    await fetch(`/api/agreements/${a.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    });
    reload();
  };

  /** Stage the contractor would deliver next (needs client green light). */
  const nextDeliverable = (a: Agreement) =>
    a.stages.findIndex((s) => !s.approved && !s.deliveredAt);

  const list = tab === 'mine' ? mine : asClient;
  const ongoing = list.filter((a) => a.status === 'pending' || a.status === 'active');
  const history = list.filter((a) => a.status === 'completed' || a.status === 'cancelled');

  const card = (a: Agreement) => {
    const st = STATUS_LABEL[a.status];
    const nextIdx = nextDeliverable(a);
    const next = nextIdx >= 0 ? a.stages[nextIdx] : undefined;
    const canDelete = a.status !== 'active';
    return (
      <div key={a.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">{a.title}</p>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.cls}`}>
              {st.text}
            </span>
            {canDelete && (
              <button
                onClick={() => remove(a)}
                aria-label="Eliminar acuerdo"
                className="text-slate-500 transition hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 font-mono text-xs text-slate-400">
          {formatAmount(a.totalAmount, a.currency)} · {a.stageCount} etapas de{' '}
          {formatAmount(stageAmountOf(a), a.currency)}
          {a.clientName ? ` · Cliente: ${a.clientName}` : ''}
        </p>

        {/* QR / link to share with the client (pre-deposit) */}
        {a.status === 'pending' && tab === 'mine' && (
          <div className="mt-3">
            {a.linkActive ? (
              <>
                <div className="mx-auto w-fit rounded-xl bg-white p-2.5">
                  <QRCodeSVG value={`${origin}/acuerdo/${a.id}`} size={140} level="M" />
                </div>
                <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] text-slate-500">
                  <QrCode className="h-3 w-3" /> El cliente lo escanea para depositar.
                </p>
                <button
                  onClick={async () => {
                    await agreementAction(a.id, { action: 'deactivate-link' });
                    reload();
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-700/60 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40"
                >
                  <PowerOff className="h-3.5 w-3.5" /> Desactivar enlace
                </button>
              </>
            ) : (
              <button
                onClick={async () => {
                  await agreementAction(a.id, { action: 'reactivate-link' });
                  reload();
                }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-700/60 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-950/40"
              >
                <Power className="h-3.5 w-3.5" /> Reactivar enlace
              </button>
            )}
          </div>
        )}

        {/* Contractor delivers the current stage — only with green light */}
        {a.status === 'active' && tab === 'mine' && nextIdx >= 0 && next && (
          next.authorizedAt ? (
            <button
              onClick={async () => {
                await agreementAction(a.id, { action: 'deliver', stageIndex: nextIdx });
                reload();
              }}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 py-2.5 text-xs font-medium text-white hover:bg-sky-500"
            >
              <PackageCheck className="h-4 w-4" />
              Entregar etapa {nextIdx + 1}
            </button>
          ) : (
            <p className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-700 py-2.5 text-xs text-slate-500">
              <Hourglass className="h-3.5 w-3.5" />
              Esperando luz verde del cliente para la etapa {nextIdx + 1}
            </p>
          )
        )}
        {a.status === 'active' && tab === 'mine' && nextIdx === -1 && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Todas las etapas entregadas — esperando aprobación del cliente.
          </p>
        )}

        <Link
          href={`/acuerdo/${a.id}`}
          className="mt-3 block text-center text-xs text-cyan-400 underline hover:text-cyan-300"
        >
          Ver detalle del acuerdo
        </Link>
      </div>
    );
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-4">
      <Link href="/" className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Acuerdos por etapas</h1>
          <p className="text-xs text-slate-400">
            Cobros garantizados — el cliente deposita el 100% antes de empezar.
          </p>
        </div>
        {!creating && tab === 'mine' && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500"
          >
            <FileSignature className="h-4 w-4" /> Nuevo
          </button>
        )}
      </div>

      {/* Role tabs */}
      <div className="mt-4 flex rounded-xl border border-slate-800 p-0.5 text-sm">
        {(
          [
            ['mine', 'Creados por mí'],
            ['client', 'Como cliente'],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 transition ${
              tab === t ? 'bg-slate-800 text-slate-100' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Creation wizard */}
      {creating && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Nuevo acuerdo</h2>
            <button onClick={() => setCreating(false)} aria-label="Cerrar" className="p-1 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mt-3 block text-xs uppercase tracking-wide text-slate-400">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Diseño de sitio web"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-500"
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wide text-slate-400">Monto total</label>
              <input
                inputMode="decimal"
                value={total}
                onChange={(e) => setTotal(e.target.value.replace(/[^0-9.,]/g, ''))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-slate-400">Moneda</label>
              <div className="mt-1 flex rounded-xl border border-slate-700 p-0.5 text-sm">
                {(['ARS', 'USD'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`flex-1 rounded-lg py-2 font-mono transition ${
                      currency === c ? 'bg-slate-800 text-slate-100' : 'text-slate-500'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wide text-slate-400">Etapas</label>
              <input
                inputMode="numeric"
                value={stages}
                onChange={(e) => setStages(e.target.value.replace(/[^0-9]/g, ''))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-slate-400">
                Auto-aprobación (días)
              </label>
              <input
                inputMode="numeric"
                value={days}
                onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ''))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {valid && (
            <div className="mt-3 rounded-xl bg-slate-950 px-3 py-2.5 text-xs text-slate-400">
              {stageNum} etapas de{' '}
              <span className="font-mono text-cyan-300">
                {formatAmount(totalNum / stageNum, currency)}
              </span>{' '}
              cada una. El cliente deposita el 100% por adelantado y habilita
              cada etapa nueva con su luz verde.
            </div>
          )}

          <button
            onClick={submit}
            disabled={!valid}
            className="mt-4 w-full rounded-xl bg-cyan-600 py-3 text-sm font-medium text-white transition enabled:hover:bg-cyan-500 disabled:opacity-40"
          >
            Crear acuerdo
          </button>
        </div>
      )}

      {/* Ongoing agreements */}
      <div className="mt-4 space-y-3">
        {ongoing.map(card)}
        {ongoing.length === 0 && !creating && (
          <p className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
            {tab === 'mine'
              ? 'Todavía no creaste acuerdos. Empezá uno nuevo para recibir pagos por etapas.'
              : 'No tenés acuerdos en curso como cliente.'}
          </p>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-5">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-800 px-3 py-2.5 text-xs uppercase tracking-wide text-slate-400 hover:text-slate-200"
          >
            Historial ({history.length})
            {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {historyOpen && <div className="mt-3 space-y-3">{history.map(card)}</div>}
        </div>
      )}
    </main>
  );
}
