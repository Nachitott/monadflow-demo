import { Gauge, Layers, Zap } from 'lucide-react';
import Section from './Section';

const PILLARS = [
  {
    icon: Zap,
    title: 'Confirmación en menos de un segundo',
    body: 'Cada pago por uso se asienta al instante. No esperás minutos para saber que te cobraron bien.',
  },
  {
    icon: Gauge,
    title: 'Miles de pagos simultáneos',
    body: 'La red procesa miles de operaciones por segundo, así que miles de personas pueden estar pagando al mismo tiempo sin que se trabe nada.',
  },
  {
    icon: Layers,
    title: 'Sin esperas entre operaciones',
    body: 'Monad ejecuta en paralelo lo que otras redes hacen en fila. Un gimnasio no bloquea a otro porque esté pasando lo mismo.',
  },
];

export default function WhyMonad() {
  return (
    <Section
      id="monad"
      eyebrow="Por qué Monad"
      title="La infraestructura que hace posible esto"
      lede="Cobrar por segundo real no es un detalle de la base de datos. Necesitás una red que pueda resolver millones de micro-operaciones sin acumular una atrás de otra. Monad está diseñada exactamente para eso, y por eso la plata llega en menos de un segundo y sin comisiones para vos."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <article
            key={pillar.title}
            className="rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/[0.07] to-transparent p-7"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15">
              <pillar.icon className="h-5 w-5 text-indigo-300" aria-hidden />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-slate-50">{pillar.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{pillar.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}