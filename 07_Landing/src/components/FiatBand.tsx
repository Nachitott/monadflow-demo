import { ArrowDownUp, ArrowUpRight, Banknote } from 'lucide-react';
import Section from './Section';

export default function FiatBand() {
  return (
    <Section
      id="moneda"
      eyebrow="Moneda"
      title="Cargá en pesos, guardá en dólares"
      lede="Tu saldo vive en dos cuentas separadas dentro de la misma app. Cargás en pesos un día, en dólares otro, y convertís cuando te convenga, sin salir de la plataforma."
      className="bg-slate-900/30"
    >
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10">
              <Banknote className="h-5 w-5 text-emerald-400" aria-hidden />
            </span>
            <h3 className="mt-5 font-semibold text-slate-50">Pesos argentinos</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Cargás desde Mercado Pago o por CVU. El saldo queda disponible al
              instante para pagar tu próxima sesión.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
              <ArrowUpRight className="h-5 w-5 text-cyan-400" aria-hidden />
            </span>
            <h3 className="mt-5 font-semibold text-slate-50">Dólares</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Para guardar valor o para pagarle a alguien de afuera. Después podés
              retirarlo a tu cuenta en pesos cuando quieras.
            </p>
          </article>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-7 ring-glow">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Tus cuentas</p>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
              Convertís cuando quieras
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {[
              { label: 'Pesos (ARS)', value: '$ 84.300', tone: 'text-emerald-400' },
              { label: 'Dólares (USD)', value: 'US$ 210', tone: 'text-cyan-400' },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3.5"
              >
                <span className="text-sm text-slate-300">{row.label}</span>
                <span className={`font-mono text-xl font-semibold tabular-nums ${row.tone}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            El tipo de cambio que ves es el que se aplica. Cuando cerrás un acuerdo,
            el monto queda fijo en la moneda que elegiste, así que no te cambia
            mientras tanto.
          </p>
        </div>
      </div>
    </Section>
  );
}