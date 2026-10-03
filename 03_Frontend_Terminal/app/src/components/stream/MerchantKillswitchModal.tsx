'use client';

import { Power, X } from 'lucide-react';

interface Props {
  merchantName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDeactivation: () => void;
}

export default function MerchantKillswitchModal({
  merchantName,
  isOpen,
  onClose,
  onConfirmDeactivation,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
      <div className="w-full max-w-sm rounded-2xl border border-rose-500/40 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-rose-400">
            <Power className="h-5 w-5" />
            Desactivar ingresos
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1 text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-300">
          ¿Desactivar el código QR de <span className="font-medium">{merchantName}</span>?
          No se permitirán nuevos ingresos hasta reactivarlo.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Las sesiones en curso continúan — se cerrarán cobrando lo consumido
          cuando generes un código nuevo.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:border-slate-500"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmDeactivation}
            className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-medium text-white hover:bg-rose-500"
          >
            Desactivar QR
          </button>
        </div>
      </div>
    </div>
  );
}
