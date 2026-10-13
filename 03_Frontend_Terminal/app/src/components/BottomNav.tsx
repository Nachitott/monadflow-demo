'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layers, QrCode, Send, Timer } from 'lucide-react';
import QRScanner from '@/components/stream/QRScanner';
import { universalParse } from '@/lib/qrParse';

/**
 * Universal scan: every QR in the app encodes an internal link
 * (/consumo?m= merchant, /enviar?to= personal, /acuerdo/[id]). The parser
 * (src/lib/qrParse.ts) returns the destination path and the router just
 * navigates there. Raw fallbacks: 'qr-…' → merchant code, bare alias → P2P.
 */

export default function BottomNav() {
  const router = useRouter();
  const [scanOpen, setScanOpen] = useState(false);

  const itemClass =
    'flex flex-1 flex-col items-center gap-1 py-3 text-xs text-slate-400 transition hover:text-slate-200';

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto flex max-w-md items-end border-t border-slate-800 bg-slate-950/90 px-6 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <Link href="/consumo" className={itemClass}>
            <Timer className="h-5 w-5" />
            Por uso
          </Link>

          <Link href="/enviar" className={itemClass}>
            <Send className="h-5 w-5" />
            Enviar
          </Link>

          <div className="flex flex-1 justify-center">
            <button
              onClick={() => setScanOpen(true)}
              aria-label="Escanear código"
              className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 ring-4 ring-slate-950 transition hover:bg-indigo-500"
            >
              <QrCode className="h-7 w-7" />
            </button>
          </div>

          <Link href="/acuerdo" className={itemClass}>
            <Layers className="h-5 w-5" />
            Etapas
          </Link>
        </div>
      </nav>

      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4">
          <QRScanner
            parse={(text) => universalParse(text, window.location.origin)}
            onResult={(path) => {
              setScanOpen(false);
              router.push(path);
            }}
            onCancel={() => setScanOpen(false)}
          />
        </div>
      )}
    </>
  );
}
