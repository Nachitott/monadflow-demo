'use client';

import { useEffect, useState } from 'react';

export interface StreamTimer {
  elapsedSeconds: number;
  accrued: number;
  capReached: boolean;
  /** 0..1 fraction of the cap consumed. */
  capProgress: number;
}

export function useTimeStreamTimer(
  startTime: number,
  ratePerSecond: number,
  maxCap: number,
): StreamTimer {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const elapsedSeconds = Math.max(0, (now - startTime) / 1000);
  const accrued = Math.min(elapsedSeconds * ratePerSecond, maxCap);
  const capReached = accrued >= maxCap;

  return { elapsedSeconds, accrued, capReached, capProgress: accrued / maxCap };
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}
