'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import {
  ArrowLeft,
  Loader2,
  Lock,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import ApproveStageButton from '@/components/escrow/ApproveStageButton';
import CancelEscrowModal from '@/components/escrow/CancelEscrowModal';
import MilestoneTracker from '@/components/escrow/MilestoneTracker';
import { useBalances } from '@/lib/BalanceContext';
import {
  agreementAction,
  fetchAgreement,
  frozenAmountOf,
  stageAmountOf,
  type Agreement,
} from '@/lib/api';
import { formatAmount } from '@/lib/useExchangeRate';

export default function AgreementDetailPage() {
  const { ready, authenticated, user } = usePrivy();
  const { id } = useParams<{ id: string }>();
  const { balances, updateBalance } = useBalances();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [missing, setMissing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  const reload = useCallback(async () => {
    const a = await fetchAgreement(id);
    if (a) setAgreement(a);
    else setMissing(true);
  }, [id]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    reload();
    const poll = setInterval(() => {
      reload();
      setNow(Date.now());
    }, 3_000);
    return () => clearInterval(poll);
  }, [ready, authenticated, reload]);

  if (!ready || (!agreement && !missing)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </main>
    );
  }
  if (!authenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-300">Iniciá sesión para ver este acuerdo.</p>
        <Link href="/" className="text-indigo-400 underline">Volver al inicio</Link>
      </main>
    );
  }
  if (missing || !agreement) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-300">Este acuerdo no existe o el enlace ya no está vigente.</p>
        <Link href="/" className="text-indigo-400 underline">Volver al inicio</Link>
      </main>
    );
  }

  const a = agreement;
  const stageAmt = stageAmountOf(a);
  const frozen = frozenAmountOf(a);
  const clientName =
    user?.google?.name ?? user?.apple?.email ?? user?.email?.address ?? 'Cliente';
  const isClient = a.clientId === user?.id;
  const isContractor = a.contractorId === user?.id;
  const stage0Paid = a.stages[0]?.approved;
  const currentReview = a.stages.findIndex((s) => s.deliveredAt && !s.approved);
  const nextToAuthorize = a.stages.findIndex(
    (s) => !s.approved && !s.authorizedAt,
  );
  // A work session = a stage authorized or under review that is not paid
  // yet. While one exists, the agreement cannot be cancelled.
  const workSessionActive = a.stages.some(
    (s) => !s.approved && (s.authorizedAt || s.deliveredAt),
  );
  const enoughBalance =
    (a.currency === 'ARS' ? balances.ARS : balances.USD) >= a.totalAmount;

  const daysLeft = (deliveredAt?: number) => {
    if (!a.autoApproveDays || !deliveredAt) return null;
    const ms = a.autoApproveDays * 24 * 60 * 60 * 1000 - (now - deliveredAt);
    if (ms <= 0) return 'se aprueba automáticamente';
    return `auto-aprobación en ${Math.ceil(ms / (24 * 60 * 60 * 1000))} días`;
  };

  const deposit = async () => {
    if (!enoughBalance) return;
    updateBalance(-a.totalAmount, a.currency);
    setAgreement(
      await agreementAction(a.id, {
        action: 'deposit',
        clientId: user?.id ?? 'anon',
        clientName,
      }),
    );
  };

  const confirmCancel = async () => {
    setCancelOpen(false);
    const updated = await agreementAction(a.id, { action: 'cancel' });
    setAgreement(updated);
    if (updated.status === 'cancelled') updateBalance(frozen, a.currency);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-4">
      <Link
        href={isContractor ? '/acuerdo' : '/'}
        className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> {isContractor ? 'Mis acuerdos' : 'Inicio'}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{a.title}</h1>
          <p className="text-xs text-slate-400">
            {a.contractorName} · {a.stageCount} etapas de {formatAmount(stageAmt, a.currency)}
          </p>
        </div>
        <span className="font-mono text-lg text-cyan-300">
          {formatAmount(a.totalAmount, a.currency)}
        </span>
      </div>

      {/* Pre-deposit: client locks 100% */}
      {a.status === 'pending' && !isContractor && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          {a.linkActive ? (
            <>
              <div className="flex items-center gap-2 text-sm text-cyan-300">
                <ShieldCheck className="h-5 w-5" />
                Fondo de garantía protegido
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Depositás el 100% ({formatAmount(a.totalAmount, a.currency)}) que
                queda congelado hasta que apruebes cada etapa. La primera etapa
                se libera con tu aprobación y el resto solo cuando confirmes.
              </p>
              {!enoughBalance && (
                <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  Tu saldo en {a.currency} no alcanza — cargá saldo primero.
                </p>
              )}
              <button
                onClick={deposit}
                disabled={!enoughBalance}
                className="sticky bottom-4 mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3 font-medium text-white shadow-lg shadow-cyan-950/50 transition enabled:hover:bg-cyan-500 disabled:opacity-40"
              >
                <Lock className="h-4 w-4" />
                Depositar {formatAmount(a.totalAmount, a.currency)}
              </button>
            </>
          ) : (
            <p className="py-2 text-center text-sm text-rose-300">
              El contratista desactivó este enlace de pago.
            </p>
          )}
        </div>
      )}

      {a.status !== 'pending' && <MilestoneTracker agreement={a} />}

      {/* Delivered stage awaiting review → approve */}
      {a.status === 'active' && isClient && currentReview >= 0 && (
        <div className="mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-4">
          <p className="text-sm font-medium text-cyan-200">
            Etapa {currentReview + 1} entregada para tu revisión
          </p>
          {daysLeft(a.stages[currentReview].deliveredAt) && (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
              <Timer className="h-3 w-3" />
              {daysLeft(a.stages[currentReview].deliveredAt)}
            </p>
          )}
          <div className="mt-3">
            <ApproveStageButton
              stageAmount={stageAmt}
              currency={a.currency}
              onApprove={async () => {
                setAgreement(
                  await agreementAction(a.id, { action: 'approve', stageIndex: currentReview }),
                );
              }}
            />
          </div>
        </div>
      )}

      {/* Client green light for the next stage — payment gets committed
          while the contractor works on it. */}
      {a.status === 'active' &&
        isClient &&
        currentReview === -1 &&
        nextToAuthorize >= 0 && (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm font-medium">
              ¿Continuar con la etapa {nextToAuthorize + 1}?
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Al dar luz verde, el pago de esa etapa ({formatAmount(stageAmt, a.currency)})
              queda comprometido y no podés cancelar hasta que se resuelva.
            </p>
            <button
              onClick={async () => {
                setAgreement(
                  await agreementAction(a.id, { action: 'authorize-next' }),
                );
              }}
              className="mt-3 w-full rounded-xl bg-sky-600 py-3 text-sm font-medium text-white transition hover:bg-sky-500"
            >
              Dar luz verde para la etapa {nextToAuthorize + 1}
            </button>
          </div>
        )}

      {/* Cancel CTA — only between work sessions */}
      {a.status === 'active' && isClient && (
        <button
          onClick={() => setCancelOpen(true)}
          disabled={!stage0Paid || workSessionActive}
          className="mt-4 w-full rounded-xl border border-rose-700/60 py-3 text-sm font-medium text-rose-400 transition enabled:hover:bg-rose-950/40 disabled:opacity-40"
        >
          {!stage0Paid
            ? 'Cancelación disponible después de liberar la etapa 1'
            : workSessionActive
              ? 'Cancelación disponible al resolver la etapa en curso'
              : 'Cancelar proyecto'}
        </button>
      )}

      {a.status === 'completed' && (
        <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center text-sm text-emerald-300">
          Acuerdo completado — todas las etapas fueron liberadas.
        </p>
      )}
      {a.status === 'cancelled' && (
        <p className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-center text-sm text-slate-300">
          Acuerdo cancelado — se devolvieron {formatAmount(frozen, a.currency)} a tu cuenta.
        </p>
      )}

      <CancelEscrowModal
        isOpen={cancelOpen}
        remainingRefundAmount={frozen}
        currency={a.currency}
        onClose={() => setCancelOpen(false)}
        onConfirmCancellation={confirmCancel}
      />
    </main>
  );
}
