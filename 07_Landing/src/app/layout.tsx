import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'MonadFlow — Pagá por lo que usás, cobrá con garantía',
  description:
    'Pagos en tiempo real al uso y acuerdos con fondos 100% garantizados, simple como cualquier app. Sin comisiones, sin boredom, en pesos o dólares.',
  applicationName: 'MonadFlow',
  keywords: [
    'pagos en tiempo real',
    'cobro por uso',
    'garantía de pago',
    'trabajos por etapas',
    'pesos argentinos',
    'Monad',
  ],
  openGraph: {
    title: 'MonadFlow — Pagá por lo que usás, cobrá con garantía',
    description:
      'Cobro automático por tiempo de uso y acuerdos con el 100% del dinero protegido hasta que el trabajo se entregue.',
    locale: 'es_AR',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#020617',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}