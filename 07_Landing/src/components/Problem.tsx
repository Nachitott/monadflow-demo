import { CalendarX, FileSignature, Receipt } from 'lucide-react';
import Section from './Section';

const PAINS = [
  {
    icon: Receipt,
    title: 'Cobrar por cada uso es un bardo',
    body: 'Los gimnasios y coworkings manejan esto con libretas de papel o apps que no se integran con nada. Al final del mes alguien tiene que estar cuadrando las cuentas de todos a mano.',
  },
  {
    icon: CalendarX,
    title: 'La suscripción se te escapa de las manos',
    body: 'No sabés cuánto vas a usar hasta que ya usaste. El comercio tampoco tiene forma de frenar un consumo desmedido sin frenar al cliente.',
  },
  {
    icon: FileSignature,
    title: 'Contratarte sin garantía es una lotería',
    body: 'Si pagás por adelantado tenés miedo de que no aparezcan. Si pagás al final, el otro no tiene incentivo para trabajar. Quedás siempre en el medio, sin forma de acordar.',
  },
];

export default function Problem() {
  return (
    <Section
      id="problema"
      eyebrow="El problema"
      title="Dos dolores, una misma raíz: cobrar es engorroso"
      lede="Cada uno de nosotros pierde plata y tiempo en el mismo bucle, y casi siempre por falta de una capa que coordine el dinero con el trabajo real."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {PAINS.map((pain) => (
          <article
            key={pain.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7 transition hover:border-slate-700"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10">
              <pain.icon className="h-5 w-5 text-rose-400" aria-hidden />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-slate-50">{pain.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{pain.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}