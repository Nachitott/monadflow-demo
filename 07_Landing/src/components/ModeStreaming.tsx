import { Clock, FileText, Gauge, Power, Printer, RefreshCw, Wallet } from 'lucide-react';
import Section from './Section';

const FEATURES = [
  {
    icon: Printer,
    title: 'Un solo código, siempre el mismo',
    body: 'El comercio muestra un QR fijo. No hay que imprimir uno nuevo cada semana ni reconfigurar nada.',
  },
  {
    icon: Wallet,
    title: 'Vos elegís cuánto gastar',
    body: 'Antes de entrar ponés un tope. Cuando lo alcanzás, se frena solo. Nunca te cobran de más.',
  },
  {
    icon: Gauge,
    title: 'El comercio ve todo en vivo',
    body: 'Clientes conectados, minutos Corridos y monto acumulado, actualizándose en el momento.',
  },
  {
    icon: RefreshCw,
    title: 'Frecuencia a elección',
    body: 'Cada 1 minuto, cada 5, cada 15, o cuando el dueño quiera apretar el botón.',
  },
  {
    icon: FileText,
    title: 'Reporte de cierre diario',
    body: 'Al terminar el día, un resumen exportable con cuánto se facturó y a cuántos clientes se atendió.',
  },
  {
    icon: Power,
    title: 'Botón de apagado',
    body: '¿Mantenimiento o cambio de tarifa? Cortás el código al instante y seguís operando.',
  },
];

export default function ModeStreaming() {
  return (
    <Section
      id="modo-1"
      eyebrow="Modo 1 · Gimnasios, coworkings, salas de ensayo"
      title="Cobrá mientras te usan"
      lede="El cliente entra escaneando y empieza a correr un reloj. Vos vas viendo la plata caer en tiempo real, sin pedirle nada ni preguntarle nada."
      className="bg-slate-900/30"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 transition hover:border-emerald-500/40"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10">
              <feature.icon className="h-5 w-5 text-emerald-400" aria-hidden />
            </span>
            <h3 className="mt-5 font-semibold text-slate-50">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-400" aria-hidden />
          Se paga por segundo, no por aproximación
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-emerald-400" aria-hidden>
            $
          </span>
          En pesos o en dólares, como te quede mejor
        </span>
      </div>
    </Section>
  );
}