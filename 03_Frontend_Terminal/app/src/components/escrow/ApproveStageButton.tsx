'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { formatAmount, type Currency } from '@/lib/useExchangeRate';

interface Props {
  stageAmount: number;
  currency: Currency;
  disabled?: boolean;
  onApprove: () => Promise<void> | void;
}

/**
 * One-click stage approval — releases the stage fraction to the
 * contractor. No confirmation dialogs, silent background action.
 */
export default function ApproveStageButton({
  stageAmount,
  currency,
  disabled,
  onApprove,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handle = async () => {
    setBusy(true);
    await onApprove();
    setBusy(false);
    setDone(true);
  };

  return (
    <button
      onClick={handle}
      disabled={disabled || busy || done}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3 text-sm font-medium text-white transition enabled:hover:bg-cyan-500 disabled:opacity-40"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : done ? (
        <Check className="h-4 w-4" />
      ) : null}
      {done ? 'Pago liberado' : `Aprobar y liberar ${formatAmount(stageAmount, currency)}`}
    </button>
  );
}
