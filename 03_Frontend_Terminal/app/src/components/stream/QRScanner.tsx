'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraOff, ScanLine, X } from 'lucide-react';

interface Props {
  /** Called with the `m` code extracted from a scanned MonadFlow link. */
  onResult: (code: string) => void;
  onCancel: () => void;
}

const extractCode = (text: string): string | null => {
  try {
    const url = new URL(text);
    return url.searchParams.get('m');
  } catch {
    // Some scanners may hand back the raw code — accept qr-xxx directly.
    return /^qr-[\w-]+$/.test(text.trim()) ? text.trim() : null;
  }
};

export default function QRScanner({ onResult, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let cancelled = false;

    const id = `qr-reader-${Math.random().toString(36).slice(2)}`;
    if (containerRef.current) containerRef.current.id = id;

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const s = new Html5Qrcode(id);
        scanner = s;
        await s.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            const code = extractCode(text);
            if (code && !done.current) {
              done.current = true;
              onResult(code);
            }
          },
          () => {},
        );
      } catch {
        if (!cancelled) setError('No se pudo acceder a la cámara. Revisá los permisos o ingresá sin escanear.');
      }
    })();

    return () => {
      cancelled = true;
      scanner?.stop().catch(() => {}).then(() => scanner?.clear());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="relative h-56 w-full max-w-xs overflow-hidden rounded-3xl border-2 border-emerald-500/50 bg-black">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <CameraOff className="h-8 w-8 text-slate-500" />
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        ) : (
          <div ref={containerRef} className="h-full w-full [&_video]:h-full [&_video]:object-cover" />
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <ScanLine className="h-10 w-10 text-emerald-400/60" />
        </div>
      </div>
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
      >
        <X className="h-4 w-4" /> Volver
      </button>
    </div>
  );
}
