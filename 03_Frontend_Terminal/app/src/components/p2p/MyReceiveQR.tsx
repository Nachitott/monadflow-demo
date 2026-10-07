'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AtSign, CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { useTransfers } from '@/lib/useTransfers';

export default function MyReceiveQR() {
  const { myAlias, registerAlias } = useTransfers();
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRegister = async () => {
    setSaving(true);
    setError(null);
    const { alias, error: err } = await registerAlias(input);
    setSaving(false);
    if (err) {
      setError(
        err === 'alias_taken'
          ? 'Ese alias ya está en uso. Probá con otro.'
          : err === 'invalid_alias'
            ? 'Usá 3-25 caracteres: letras, números, punto, guion o barra baja.'
            : 'No se pudo guardar, intentá nuevamente.',
      );
    } else if (alias) {
      setInput('');
    }
  };

  if (!myAlias) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm font-medium text-slate-200">Creá tu alias para cobrar</p>
        <p className="text-xs text-slate-400">
          Es tu identificador público — como un CVU. Quien te quiera enviar dinero lo usa
          o escanea tu código.
        </p>
        <div className="relative">
          <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toLowerCase())}
            placeholder="ej: nacho.mp"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <button
          onClick={handleRegister}
          disabled={input.trim().length < 3 || saving}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Guardar alias
        </button>
      </div>
    );
  }

  const link =
    typeof window !== 'undefined'
      ? `${window.location.origin}/enviar?to=${encodeURIComponent(myAlias.alias)}`
      : `/enviar?to=${myAlias.alias}`;

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">Tu código de cobro</p>
      <div className="rounded-2xl bg-white p-4">
        <QRCodeSVG value={link} size={180} />
      </div>
      <p className="font-mono text-sm text-indigo-300">{myAlias.alias}</p>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(myAlias.alias).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="flex items-center gap-2 text-xs text-slate-400 transition hover:text-slate-200"
      >
        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copiado' : 'Copiar alias'}
      </button>
    </div>
  );
}
