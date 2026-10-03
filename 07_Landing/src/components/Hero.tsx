import { ArrowRight, ShieldCheck, QrCode, Sparkles } from 'lucide-react';
import LiveTimer from './LiveTimer';

const STATS = [
  { value: '$0', label: 'Comisiones para vos' },
  { value: '< 1s', label: 'Confirmación' },
  { value: '100%', label: 'Fondo upfront' },
];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-5 pb-24 pt-20 sm:pt-28">
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
      <div
        className="absolute -left-40 top-0 -z-10 h-96 w-96 animate-drift rounded-full bg-indigo-600/25 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -right-32 top-40 -z-10 h-80 w-80 animate-drift rounded-full bg-purple-500/20 blur-3xl"
        aria-hidden
      />

      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Construido sobre Monad
          </span>

          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            Pagá por lo que usás.
            <br />
            Cobrá <span className="text-gradient">con garantía</span>.
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-slate-400">
            Entrás con tu cuenta de Google y listo. El gimnasio, el coworking o el
            freelance te cobran lo justo, en vivo y sin comisiones. Y si contratás
            un trabajo por etapas, tu plata queda protegida hasta que entregues.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#demo"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white transition hover:bg-indigo-500"
            >
              Probar la app
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-6 py-3.5 font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Ver cómo funciona
            </a>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-slate-800 pt-8">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="font-mono text-2xl font-semibold text-slate-50">
                  {stat.value}
                </dt>
                <dd className="mt-1 text-xs leading-snug text-slate-500">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-indigo-600/20 to-purple-500/10 blur-2xl"
            aria-hidden
          />
          <LiveTimer />
        </div>
      </div>

      <div className="mx-auto mt-20 flex max-w-3xl flex-col gap-4 sm:flex-row sm:justify-center">
        {[
          { icon: QrCode, text: 'Escaneás un código y ya estás pagando' },
          { icon: ShieldCheck, text: 'El 100% del trabajo queda cubierto' },
        ].map(({ icon: Icon, text }) => (
          <p
            key={text}
            className="flex items-center justify-center gap-2 text-sm text-slate-400"
          >
            <Icon className="h-4 w-4 text-indigo-400" aria-hidden />
            {text}
          </p>
        ))}
      </div>
    </section>
  );
}