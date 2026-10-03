'use client';

export interface Merchant {
  name: string;
  ratePerMinute: number; // ARS
  qrId: string;
  /** false = QR desactivado por el killswitch. */
  active: boolean;
}

const KEY = 'monadflow:merchant';

const newQrId = () =>
  `qr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function getMerchant(): Merchant {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Merchant;
  } catch {
    /* fall through */
  }
  const m: Merchant = {
    name: 'Cowork Central',
    ratePerMinute: 25,
    qrId: newQrId(),
    active: true,
  };
  localStorage.setItem(KEY, JSON.stringify(m));
  return m;
}

function save(m: Merchant): Merchant {
  localStorage.setItem(KEY, JSON.stringify(m));
  window.dispatchEvent(new Event('monadflow:storage'));
  return m;
}

/** Killswitch: desactiva el QR actual. Las sesiones en curso continúan. */
export const deactivateQr = (): Merchant =>
  save({ ...getMerchant(), active: false });

/** Genera un código QR completamente nuevo y lo deja activo. */
export const regenerateQr = (): Merchant =>
  save({ ...getMerchant(), qrId: newQrId(), active: true });

/** Deep link que viaja dentro del QR — al escanearlo abre el check-in. */
export const qrLink = (m: Merchant, origin: string): string =>
  `${origin}/consumo?m=${m.qrId}`;
