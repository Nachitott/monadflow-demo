/**
 * Pure QR payload parsers — no DOM, fully unit-testable.
 * Every QR in the app encodes an internal link (/consumo?m= merchant,
 * /enviar?to= personal, /acuerdo/[id]); raw fallbacks cover plain
 * merchant codes ('qr-…') and bare aliases.
 */

export const ALIAS_RE = /^[a-z0-9][a-z0-9._-]{2,24}$/;

/**
 * Universal scanner target → internal route.
 * Returns the destination path (with query) or null if unrecognized.
 * `origin` is the app's base URL (window.location.origin).
 */
export function universalParse(text: string, origin = 'https://app.local'): string | null {
  const t = text.trim();
  try {
    // NOTE: with a base URL, 'qr-…' or 'nacho.mp' resolve as relative
    // paths without throwing — only accept recognized app routes here,
    // then fall through to the raw fallbacks.
    const url = new URL(t, origin);
    if (/^\/(consumo|enviar|acuerdo)/.test(url.pathname)) {
      return url.pathname + url.search;
    }
  } catch {
    /* not a URL — try raw fallbacks */
  }
  if (/^qr-[\w-]+$/.test(t)) return `/consumo?m=${encodeURIComponent(t)}`;
  if (ALIAS_RE.test(t)) return `/enviar?to=${encodeURIComponent(t)}`;
  return null;
}

/**
 * P2P recipient parser: accepts a /enviar?to=<alias> link or a bare alias.
 * Returns the alias or null.
 */
export function parseRecipient(text: string): string | null {
  try {
    const url = new URL(text);
    const to = url.searchParams.get('to');
    if (to) return to;
    const m = url.pathname.match(/\/enviar/);
    return m ? url.searchParams.get('to') : null;
  } catch {
    const raw = text.trim().toLowerCase();
    return ALIAS_RE.test(raw) ? raw : null;
  }
}
