import { Waves } from 'lucide-react';

const COLUMNS = [
  {
    title: 'Producto',
    links: ['Pago por uso', 'Trabajo por etapas', 'Pesos y dólares'],
  },
  {
    title: 'Cómo funciona',
    links: ['Paso a paso', 'Preguntas frecuentes', 'Para comercios'],
  },
  {
    title: 'Tecnología',
    links: ['Red Monad', 'Cifrado y seguridad', 'Estado del proyecto'],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 px-5 py-14">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400">
              <Waves className="h-6 w-6" aria-hidden />
              <span className="text-lg font-bold tracking-tight text-slate-50">
                MonadFlow
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              Pagos en tiempo real al uso y acuerdos con el dinero protegido.
              Simple como cualquier otra app.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold text-slate-200">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#top" className="text-sm text-slate-500 transition hover:text-slate-300">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-slate-800 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} MonadFlow. Proyecto de hackathon.
          </p>
          <p className="text-xs text-slate-600">Hecho sobre la red Monad.</p>
        </div>
      </div>
    </footer>
  );
}