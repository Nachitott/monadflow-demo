import { CheckCircle2, Clock3, Lock, ShieldCheck, Undo2 } from 'lucide-react';
import Section from './Section';

const STAGES = [
  { label: 'Etapa 1 · Diseño', state: 'done', amount: '$ 120.000' },
  { label: 'Etapa 2 · Desarrollo', state: 'review', amount: '$ 300.000' },
  { label: 'Etapa 3 · Entrega final', state: 'frozen', amount: '$ 180.000' },
] as const;

const STATE_STYLES = {
  done: { chip: 'bg-emerald-400/10 text-emerald-400', icon: CheckCircle2, text: 'Cobrada' },
  review: { chip: 'bg-amber-400/10 text-amber-400', icon: Clock3, text: 'En revisión' },
  frozen: { chip: 'bg-slate-700/40 text-slate-400', icon: Lock, text: 'Protegida' },
} as const;

export default function ModeMilestones() {
  return (
    <Section
      id="modo-2"
      eyebrow="Modo 2 · Freelancers, estudios, contratistas"
      title="Contratá sin jugarte el plata"
      lede="El cliente deposita el 100% antes de que empiece el trabajo. No es una promesa: queda protegido en la plataforma y se libera de a una etapa, solo cuando el cliente la aprueba."
    >
      <div className="grid items-start gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          {[
            {
              icon: ShieldCheck,
              title: 'La primera etapa es intocable',
              body: 'Aunque el cliente se arrepienta, la primera parte del pago ya está comprometida para el trabajador. Nadie trabaja sin cobertura mínima.',
            },
            {
              icon: Lock,
              title: 'Aprobar es un solo toque',
              body: 'El cliente ve la etapa entregada y la aprueba. Se libera esa fracción y se activa la siguiente, sin vueltas.',
            },
            {
              icon: Clock3,
              title: 'Si nadie responde, se paga igual',
              body: 'Pasado el plazo acordado, la etapa se libera sola. El trabajo terminado no se queda congelado por siempre.',
            },
            {
              icon: Undo2,
              title: 'Cancelar es transparente',
              body: 'Si se cancela después de la primera etapa, se devuelve el 100% de lo que faltaba. Cada parte queda con su estado, siempre visible.',
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10">
                <item.icon className="h-4 w-4 text-cyan-400" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold text-slate-50">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-7 ring-glow">
          <div className="flex items-center justify-between border-b border-slate-800 pb-5">
            <div>
              <p className="font-semibold text-slate-50">Landing page para el estudio</p>
              <p className="mt-1 text-xs text-slate-500">3 etapas · $ 600.000 ARS</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-400">
              <Lock className="h-3 w-3" aria-hidden />
              100% protegido
            </span>
          </div>

          <ol className="mt-6 space-y-4">
            {STAGES.map((stage) => {
              const style = STATE_STYLES[stage.state];
              const Icon = style.icon;
              return (
                <li
                  key={stage.label}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3.5"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-slate-400" aria-hidden />
                    <span className="text-sm text-slate-200">{stage.label}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-sm tabular-nums text-slate-300">
                      {stage.amount}
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 text-[11px] font-medium ${style.chip}`}
                    >
                      {style.text}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Aprobar etapa 2
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
            >
              Ver el detalle
            </button>
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
            La plata del cliente está protegida desde el primer segundo. Si algo se
            traba, un tercero asignado al acuerdo puede mediar y repartir la etapa en
            disputa.
          </p>
        </div>
      </div>
    </Section>
  );
}