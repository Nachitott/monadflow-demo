import { LogIn, ScanLine, Smartphone } from 'lucide-react';
import Section from './Section';

const STEPS = [
  {
    icon: LogIn,
    title: 'Entrás con tu cuenta',
    body: 'Google, Apple o una huella. Sin claves, sin frases que anotar, sin ninguna configuración rara. Es como entrar a cualquier otra app.',
  },
  {
    icon: ScanLine,
    title: 'Escaneás o abrís el enlace',
    body: 'En el caso del pago por uso, escaneás el código del comercio. En el de trabajos, abrís el acuerdo que te compartieron.',
  },
  {
    icon: Smartphone,
    title: 'Listo, el resto es automático',
    body: 'El reloj corre solo y vos vas viendo el saldo. Cuando querés, tocás finalizar y se acomoda todo.',
  },
];

export default function HowItWorks() {
  return (
    <Section
      id="como-funciona"
      eyebrow="Cómo funciona"
      title="Tres pasos y listo"
      lede="No hay que entender nada de tecnología para usarlo. Si alguna vez pagaste con el teléfono, ya sabés usar MonadFlow."
      className="bg-slate-900/30"
    >
      <ol className="grid gap-6 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative rounded-2xl border border-slate-800 bg-slate-950/60 p-7">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15">
                <step.icon className="h-5 w-5 text-indigo-300" aria-hidden />
              </span>
              <span className="font-mono text-4xl font-bold text-slate-800" aria-hidden>
                0{index + 1}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-50">{step.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}