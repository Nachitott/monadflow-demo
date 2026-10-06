'use client';

import { AlertTriangle, X } from 'lucide-react';
import { formatAmount, type Currency } from '@/lib/useExchangeRate';

interface Props {
  isOpen: boolean;
  remainingRefundAmount: number;
  currency: Currency;
  onClose: () => void;
  onConfirmCancellation: () => Promise<void> | void;
}

/** Cancellation modal — shows the exact refund of unapproved stages. */
export default function CancelEscrowModal({
  isOpen,
  remainingRefundAmount,
  currency,
  onClose,
  onConfirmCancellation,
}: Props) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            Cancelar proyecto
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-300">
          Se devuelve a tu cuenta el 100% de los fondos de las etapas no
          aprobadas. Las etapas ya liberadas quedan pagadas al contratista.
        </p>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3">
          <span className="text-xs text-slate-400">Reembolso inmediato</span>
          <span className="font-mono text-lg text-emerald-300">
            {formatAmount(remainingRefundAmount, currency)}
          </span>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-300 hover:border-slate-500"
          >
            Volver
          </button>
          <button
            onClick={onConfirmCancellation}
            className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-medium text-white hover:bg-rose-500"
          >
            Confirmar cancelación
          </button>
        </div>
      </div>
    </div>
  );
}
