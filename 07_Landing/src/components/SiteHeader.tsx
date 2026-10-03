import { Waves } from 'lucide-react';

const NAV = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#modo-1', label: 'Pago por uso' },
  { href: '#modo-2', label: 'Trabajo por etapas' },
  { href: '#moneda', label: 'Pesos y dólares' },
  { href: '#monad', label: 'Monad' },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#top" className="flex items-center gap-2 text-indigo-400">
          <Waves className="h-6 w-6" aria-hidden />
          <span className="text-lg font-bold tracking-tight text-slate-50">MonadFlow</span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-slate-400 transition hover:text-slate-100"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href="#demo"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Probar la app
        </a>
      </div>
    </header>
  );
}