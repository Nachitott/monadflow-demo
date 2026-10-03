'use client';

// Session state now lives on the server (src/app/api/sessions) so it is
// shared across devices — see src/lib/api.ts for the client helpers.
export type { StreamSession } from './api';
export { accruedAmount } from './api';
