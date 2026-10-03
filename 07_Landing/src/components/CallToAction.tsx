import { ArrowRight, Sparkles } from 'lucide-react';

export default function CallToAction() {
  return (
    <section id="demo" className="relative overflow-hidden px-5 py-28 sm:py-36">
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
      <div
        className="absolute left-1/2 top-1/2 -z-10 h-80 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/25 blur-3xl"
        aria-hidden
      />

      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Disponible en la red de pruebas
        </span>

        <h2 className="mt-6 text-balance text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
          Cobrá lo que usás.
          <br />
          <span className="text-gradient">Cobrá con garantía.</span>
        </h2>

        <p className="mt-6 text-pretty text-lg leading-relaxed text-slate-400">
          Para gimnasios, coworkings y comercios que hoy pierden plata en cobros
          manuales, y para freelancers que hoy trabajan sin cobertura.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="#top"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-4 font-semibold text-white transition hover:bg-indigo-500"
          >
            Probar la app
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <a
            href="#modo-2"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-7 py-4 font-semibold text-slate-200 transition hover:border-slate-500"
          >
            Ver los dos modos
          </a>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          Proyecto de hackathon construido sobre Monad. Sin comisiones para el usuario.
        </p>
      </div>
    </section>
  );
}