'use client';

import type { Merchant } from './api';

export type { Merchant };

/** Deep link carried inside the QR — scanning it opens the check-in. */
export const qrLink = (m: Merchant, origin: string): string =>
  `${origin}/consumo?m=${m.qrId}`;
