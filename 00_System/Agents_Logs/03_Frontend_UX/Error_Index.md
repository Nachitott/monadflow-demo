# Error Index

Registro de errores y soluciones.

## 2026-10-03 — Build Fase 1
1. **Module not found: `@x402/*`** — `wagmi` → `@base-org/account` → `@coinbase/cdp-sdk` importa peer deps opcionales de x402 que no están instaladas. **Solución:** aliases a `false` en `next.config.mjs` (módulos nunca usados en runtime).
2. **Warning: `@react-native-async-storage/async-storage`** — peer opcional de `@metamask/sdk`. **Solución:** mismo alias a `false`.
3. **Type error: `'passkey'` no es un `loginMethod` válido** en Privy v1. **Solución:** removido de `loginMethods` (Passkeys sigue disponible vía configuración de Privy en dashboard).
4. **Prerender error: "invalid Privy app ID"** — `PrivyProvider` falla en static generation sin `NEXT_PUBLIC_PRIVY_APP_ID`. **Solución:** `export const dynamic = 'force-dynamic'` en `layout.tsx`; la autenticación es client-side.

* [Volver al Contexto Maestro](../../CONTEXTO_MAESTRO.md)
