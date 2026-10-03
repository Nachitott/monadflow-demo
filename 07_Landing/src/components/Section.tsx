import type { ReactNode } from 'react';

type SectionProps = {
  id: string;
  eyebrow?: string;
  title?: ReactNode;
  lede?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  className = '',
}: SectionProps) {
  return (
    <section id={id} className={`relative px-5 py-24 sm:py-32 ${className}`}>
      <div className="mx-auto max-w-6xl">
        {(eyebrow || title) && (
          <div className="mx-auto max-w-2xl text-center">
            {eyebrow && (
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
                {title}
              </h2>
            )}
            {lede && (
              <p className="mt-5 text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
                {lede}
              </p>
            )}
          </div>
        )}
        <div className={title || eyebrow ? 'mt-16' : ''}>{children}</div>
      </div>
    </section>
  );
}