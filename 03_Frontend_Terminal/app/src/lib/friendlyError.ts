/**
 * Web3-invisible error layer: any thrown failure (wagmi revert, RPC
 * timeout, rejected signature, API error) maps to human es-AR copy.
 * `error.message` must never reach the screen — it can leak
 * "execution reverted", hex payloads, or network names.
 */

export const GENERIC_ERROR =
  'No se pudo procesar la solicitud, intentá nuevamente.';

const COPY: Record<string, string> = {
  user_rejected: 'Cancelaste la operación.',
  insufficient_funds: 'No tenés saldo suficiente para esa operación.',
  tx_failed: GENERIC_ERROR,
  reverted: GENERIC_ERROR,
  session_id_missing: GENERIC_ERROR,
  project_id_missing: GENERIC_ERROR,
  no_client: GENERIC_ERROR,
  no_contract: GENERIC_ERROR,
  no_token: GENERIC_ERROR,
  transfer_error: GENERIC_ERROR,
};

/** Extracts a stable snake_case code from anything thrown. */
export function errorCode(err: unknown): string {
  if (typeof err === 'string') return err;
  if (!err || typeof err !== 'object') return 'unknown';

  const name = String((err as { name?: unknown }).name ?? '');
  const msg = String((err as { message?: unknown }).message ?? '');
  const short = String((err as { shortMessage?: unknown }).shortMessage ?? '');

  // Privy/wagmi/viem rejection of a signature or tx.
  if (/user.?reject|denied|cancelled|canceled/i.test(`${name} ${msg}`))
    return 'user_rejected';
  if (/insufficient funds/i.test(msg)) return 'insufficient_funds';
  if (/revert|execution/i.test(`${short} ${name}`)) return 'reverted';
  // App-internal codes thrown as Error('snake_case').
  if (/^[a-z0-9_]{2,40}$/.test(msg)) return msg;
  return 'unknown';
}

/** Copy segura para renderizar tal cual — nunca texto técnico. */
export function humanError(err: unknown): string {
  return COPY[errorCode(err)] ?? GENERIC_ERROR;
}
