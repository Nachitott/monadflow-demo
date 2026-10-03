'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  Check,
  Clock,
  FileDown,
  Pencil,
  Power,
  PowerOff,
  QrCode,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import MerchantKillswitchModal from '@/components/stream/MerchantKillswitchModal';
import {
  accruedAmount,
  fetchMerchant,
  fetchSessions,
  merchantAction,
  type Merchant,
  type StreamSession,
} from '@/lib/api';
import { qrLink } from '@/lib/merchant';
import { formatDuration } from '@/lib/useTimeStreamTimer';
import { formatAmount } from '@/lib/useExchangeRate';

const REFRESH_OPTIONS = [
  { label: '1 min', ms: 60_000 },
  { label: '5 min', ms: 300_000 },
  { label: '15 min', ms: 900_000 },
  { label: 'Manual', ms: 0 },
] as const;

export default function ComercioPage() {
  const [sessions, setSessions] = useState<StreamSession[]>([]);
  const [allSessions, setAllSessions] = useState<StreamSession[]>([]);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [refreshMs, setRefreshMs] = useState<number>(60_000);
  const [origin, setOrigin] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const off = merchant ? !merchant.active : false;

  const reload = useCallback(async () => {
    const [m, actives, all] = await Promise.all([
      fetchMerchant(),
      fetchSessions(true),
      fetchSessions(false),
    ]);
    setMerchant(m);
    setSessions(actives);
    setAllSessions(all);
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    reload();
    // Light 2s poll keeps counters + shared state fresh; the selector
    // controls the configured cadence (1m/5m/15m/Manual).
    const tick = setInterval(reload, 2_000);
    return () => clearInterval(tick);
  }, [reload]);

  useEffect(() => {
    if (!refreshMs) return;
    const id = setInterval(reload, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, reload]);

  const handleNewQr = async () => {
    setMerchant(await merchantAction({ action: 'regenerate' }));
    reload();
  };

  const saveName = async () => {
    setEditingName(false);
    if (nameInput.trim()) {
      setMerchant(await merchantAction({ action: 'update', name: nameInput }));
    }
  };

  const saveRate = async () => {
    setEditingRate(false);
    const perHour = Number(rateInput.replace(',', '.'));
    if (perHour > 0) {
      setMerchant(
        await merchantAction({ action: 'update', ratePerMinute: perHour / 60 }),
      );
    }
  };

  const today = new Date().toDateString();
  const todays = allSessions.filter(
    (s) => new Date(s.startTime).toDateString() === today,
  );
  const totalRevenue = todays.reduce(
    (acc, s) => acc + (s.ended ? s.totalPaid ?? 0 : accruedAmount(s)),
    0,
  );

  const downloadReport = () => {
    const rows = [
      ['Cliente', 'Inicio', 'Fin', 'Minutos', 'Cobrado (ARS)'],
      ...todays.map((s) => [
        s.userName,
        new Date(s.startTime).toLocaleTimeString('es-AR'),
        s.endTime ? new Date(s.endTime).toLocaleTimeString('es-AR') : 'En curso',
        (((s.endTime ?? Date.now()) - s.startTime) / 60000).toFixed(1),
        (s.ended ? s.totalPaid ?? 0 : accruedAmount(s)).toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `cierre-${today.split(' ').join('-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-4">
      <Link href="/" className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>

      <div className="flex items-center justify-between">
        <div>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                ref={nameRef}
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="w-40 rounded-lg border border-indigo-500 bg-slate-950 px-2 py-1 text-xl font-semibold outline-none"
              />
              <button onClick={saveName} aria-label="Guardar nombre" className="text-emerald-400">
                <Check className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setNameInput(merchant?.name ?? '');
                setEditingName(true);
              }}
              className="group flex items-center gap-2"
            >
              <h1 className="text-xl font-semibold">{merchant?.name ?? '…'}</h1>
              <Pencil className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" />
            </button>
          )}
          {editingRate && merchant ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-slate-400">$ / hora</span>
              <input
                autoFocus
                inputMode="decimal"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && saveRate()}
                className="w-24 rounded-lg border border-indigo-500 bg-slate-950 px-2 py-1 font-mono text-sm outline-none"
              />
              <button onClick={saveRate} aria-label="Guardar tarifa" className="text-emerald-400">
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setRateInput(String(Math.round((merchant?.ratePerMinute ?? 0) * 60)));
                setEditingRate(true);
              }}
              className="group flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Panel del establecimiento · {merchant && formatAmount(merchant.ratePerMinute * 60, 'ARS')}/hora
              <Pencil className="h-3 w-3 text-slate-500 group-hover:text-slate-300" />
            </button>
          )}
        </div>
        {off ? (
          <span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-400">
            <PowerOff className="h-3 w-3" /> QR inactivo
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
            <Power className="h-3 w-3" /> Recibiendo clientes
          </span>
        )}
      </div>

      {/* Refresh cadence + actions */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex rounded-lg border border-slate-800 p-0.5 text-xs">
          {REFRESH_OPTIONS.map((o) => (
            <button
              key={o.label}
              onClick={() => setRefreshMs(o.ms)}
              className={`rounded-md px-2.5 py-1.5 transition ${
                refreshMs === o.ms
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {o.label === 'Manual' ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> {o.label}
                </span>
              ) : (
                o.label
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setReportOpen(true)}
            aria-label="Reporte de cierre"
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-slate-500"
          >
            <FileDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => (off ? handleNewQr() : setConfirmOff(true))}
            aria-label={off ? 'Generar nuevo QR' : 'Killswitch'}
            className={`rounded-lg p-2 transition ${
              off
                ? 'border border-emerald-600 text-emerald-400 hover:bg-emerald-950'
                : 'bg-rose-600 text-white hover:bg-rose-500'
            }`}
          >
            <Power className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active customers grid */}
      <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
        <Users className="h-4 w-4" />
        Clientes activos ({sessions.length})
      </div>

      <div className="mt-2 grid grid-cols-1 gap-3">
        {sessions.map((s) => (
          <div key={s.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{s.userName}</p>
              <span className="flex items-center gap-1 font-mono text-xs text-emerald-400">
                <Clock className="h-3 w-3" />
                {formatDuration((Date.now() - s.startTime) / 1000)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-400">Acumulado</span>
              <span className="font-mono text-emerald-300">
                {formatAmount(accruedAmount(s), s.currency)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${Math.min((accruedAmount(s) / s.maxCap) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="mt-1 text-right font-mono text-[10px] text-slate-500">
              tope {formatAmount(s.maxCap, s.currency)}
            </p>
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
            No hay clientes en el local ahora mismo.
          </p>
        )}
      </div>

      {/* Merchant QR card */}
      {merchant && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
              <QrCode className="h-4 w-4" /> Mi código de ingreso
            </p>
            <span className="font-mono text-[10px] text-slate-500">{merchant.qrId}</span>
          </div>
          <div className="relative mx-auto mt-3 w-fit rounded-xl bg-white p-3">
            <QRCodeSVG
              value={qrLink(merchant, origin || '')}
              size={200}
              level="M"
            />
            {off && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-950/90">
                <PowerOff className="h-6 w-6 text-rose-400" />
                <span className="text-xs font-medium text-rose-300">Código inactivo</span>
              </div>
            )}
          </div>
          {off ? (
            <button
              onClick={handleNewQr}
              className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Generar código nuevo
            </button>
          ) : (
            <p className="mt-3 text-center text-xs text-slate-500">
              Tus clientes lo escanean con la cámara del celular para iniciar su consumo.
            </p>
          )}
        </div>
      )}

      <MerchantKillswitchModal
        merchantName={merchant?.name ?? 'el comercio'}
        isOpen={confirmOff}
        onClose={() => setConfirmOff(false)}
        onConfirmDeactivation={async () => {
          setMerchant(await merchantAction({ action: 'deactivate' }));
          setConfirmOff(false);
        }}
      />

      {/* Daily close report */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Cierre de jornada</h2>
              <button onClick={() => setReportOpen(false)} aria-label="Cerrar" className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Clientes atendidos</dt>
                <dd className="font-mono">{todays.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Recaudación total</dt>
                <dd className="font-mono text-emerald-300">{formatAmount(totalRevenue, 'ARS')}</dd>
              </div>
            </dl>
            <button
              onClick={downloadReport}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <FileDown className="h-4 w-4" />
              Exportar reporte (CSV)
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
