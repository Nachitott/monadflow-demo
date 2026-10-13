# Error Index

Registro de errores y soluciones.

## 2026-10-03 — Build Fase 1
1. **Module not found: `@x402/*`** — `wagmi` → `@base-org/account` → `@coinbase/cdp-sdk` importa peer deps opcionales de x402 que no están instaladas. **Solución:** aliases a `false` en `next.config.mjs` (módulos nunca usados en runtime).
2. **Warning: `@react-native-async-storage/async-storage`** — peer opcional de `@metamask/sdk`. **Solución:** mismo alias a `false`.
3. **Type error: `'passkey'` no es un `loginMethod` válido** en Privy v1. **Solución:** removido de `loginMethods` (Passkeys sigue disponible vía configuración de Privy en dashboard).
4. **Prerender error: "invalid Privy app ID"** — `PrivyProvider` falla en static generation sin `NEXT_PUBLIC_PRIVY_APP_ID`. **Solución:** `export const dynamic = 'force-dynamic'` en `layout.tsx`; la autenticación es client-side.

5. **Cámara QR requiere contexto seguro** — `getUserMedia`/`html5-qrcode` solo funciona en HTTPS o `localhost`; en LAN por IP (`http://192.168.x.x`) el navegador lo bloquea. **Solución:** botón "Ingresar sin escanear (demo)" como fallback permanente; en Vercel (HTTPS) la cámara funciona.
6. **Dev server 500 recurrente: `webpack-runtime.js TypeError 'call'`** — correr `npm run build` mientras `npm run dev` está vivo corrompe `.next` (comparten el directorio). **Solución:** matar dev → `rm -rf .next` → reiniciar. Regla: nunca buildear con el dev server corriendo.

* [Volver al Contexto Maestro](../../CONTEXTO_MAESTRO.md)

## 2026-10-04 — Fase 3 cross-device
1. **QR "inválido" al escanear desde otro dispositivo** — `getMerchant()` usaba localStorage por dispositivo; el escáner resolvía un `qrId` distinto al generado en la PC. **Solución:** store compartido en memoria del server (`src/lib/server/store.ts`) consumido vía API routes; toda validación de `qrId` y ciclo de vida de sesiones pasó a server-side.
2. **Sesiones zombies tras regenerar QR** — los clientes activos seguían corriendo con el código viejo. **Solución:** `merchant.action=regenerate` cierra todas las sesiones activas server-side computando `totalPaid` por tiempo transcurrido; `/consumo` hace polling de su sesión y muestra el resumen con devolución.

## 2026-10-04 — Cross-device hardening II
3. **QR "rotaba" y códigos dados de baja "revivían" en producción** — el store in-memory es por instancia serverless de Vercel; cada request podía responder un `qrId` distinto. **Solución:** estado compartido en KV/Upstash vía REST (`src/lib/server/db.ts` + store async); fallback in-memory solo para dev local.
4. **Botón "Iniciar consumo" no visible / deshabilitado en móvil** — `mt-auto` lo empujaba fuera del viewport y `cap > saldo` lo deshabilitaba sin feedback accionable. **Solución:** botón sticky `bottom-4`, "Usar todo mi saldo" y aviso ámbar con botón "Ajustar a $X".
5. **Múltiples `next dev` zombies compartiendo `.next` → 500/404 intermitentes** — procesos viejos quedaban escuchando en 3000-3002. **Solución:** matar listeners por puerto y limpiar `.next`.
6. **Re-escaneo del QR creaba sesiones paralelas** — no había dedup por usuario. **Solución:** `userId` en sesión + 409 con reanudación en `POST /api/sessions`; `/consumo` auto-reanuda al montar.
7. **"Finalizar consumo" invisible en móvil** — mismo problema que el botón de iniciar. **Solución:** sticky `bottom-4`.
8. **Consumo quedaba corriendo sin indicador** al volver al home. **Solución:** `ActiveSessionBanner` persistente con polling.

## 2026-10-05 — Fase 4 hardening
9. **Cancelación durante sesión de trabajo dejaba etapa sin pagar** — aprobar etapa N habilitaba de inmediato la entrega N+1 y el cliente podía cancelar con una entrega en revisión. **Solución:** estado `authorizedAt` por etapa; el cliente debe dar luz verde para cada etapa nueva y la cancelación solo es posible entre sesiones (`work_session_active`).
10. **Cliente sin visibilidad de sus acuerdos** — `/acuerdo` solo listaba los creados por uno mismo. **Solución:** tabs por rol + historial compartido + eliminar en estados cerrados.

## 2026-10-05 — Fase 5
11. **P2P imposible con balances en localStorage** — la spec exige débito+crédito atómico server-side y los saldos vivían por dispositivo; el server no podía validar ni acreditar al destinatario. **Solución:** `mf:balances` en KV con seed de migración una-sola-vez; `BalanceContext` server-authoritative (localStorage como caché). Detalle: GET `/api/balances` devuelve `null` (no `ZERO`) cuando no hay registro para distinguir "sin registro" de "saldo cero".
12. **Doble débito potencial tras enviar** — `updateBalance` postea delta al server; llamarlo después de `send()` debitaría dos veces (la API de transfers ya debitó). **Solución:** `refreshBalances()` expuesto en el contexto para releer el saldo autoritativo sin postear.

## 2026-10-13 — Fase Final (deploy)
13. **Faucet de gas no-opeaba silencioso** — `/api/gas` leía `process.env.GAS_FUNDER_PRIVATE_KEY` pero `.env.example`, `Monad_Testnet_Config.md` y el backlog documentan `GAS_FAUCET_PRIVATE_KEY`; configurando el nombre documentado el endpoint devolvía `{"funded":false,"reason":"no_funder"}` sin error visible. **Solución:** renombrada la var leída a `GAS_FAUCET_PRIVATE_KEY` (nombre canónico en docs). Verificado: `funded:true` con 0.05 MON entregados a una address nueva.
14. **`forge script` falla con `vm.envUint: missing hex prefix`** — la `PRIVATE_KEY` de `02_SmartContracts_Terminal/.env` no llevaba prefijo `0x` y `vm.envUint` lo exige para parsear hex. **Solución:** normalizar `PRIVATE_KEY` agregando `0x` antes de exportarla al correr el deploy.
15. **Archivo `nul` no borrable con `del`/`Remove-Item`** — nombre reservado de dispositivo en Windows; `cmd del` y PowerShell `-LiteralPath '\\?\'` fallan. **Solución:** `rm -f nul` desde Git Bash (MSYS2 lo resuelve como path POSIX).

## 2026-10-13 — TASK_BACKLOG3 (hardening)
16. **Chain mode silenciosamente en mock pese al deploy** — `src/lib/chainMode.ts` leía `NEXT_PUBLIC_CHAIN_ENABLED` pero `.env.example`, `.env.local`, `Monad_Testnet_Config.md` y `Contract_Addresses.md` usan `NEXT_PUBLIC_CHAIN_MODE`; con `=1` configurado la app seguía sirviendo el mock sin señal alguna. **Solución:** unificar a `NEXT_PUBLIC_CHAIN_MODE === '1'` + guardrail dev-only `console.info('[monadflow] mode: …')` en `providers.tsx` para detectar caídas a mock por env mal configurada.
17. **Rejections on-chain mudas en `/comercio` y `/acuerdo`** — llamadas a contrato dentro de `try/finally` sin `catch`: un revert dejaba la UI sin feedback (spinner correcto, cero aviso). **Solución:** `src/lib/friendlyError.ts` (`errorCode`/`humanError`) sanitiza en `useContractTx` y cada pantalla tiene estado de error + banner con copy es-AR genérico; `user_rejected` → "Cancelaste la operación."
18. **Fallbacks de `universalParse` eran código muerto** — `new URL('qr-…', origin)` y `new URL('nacho.mp', origin)` resuelven como paths relativos válidos sin tirar, así que el `catch` con los fallbacks de qrId/alias crudos jamás se ejecutaba (bug latente desde la versión inline). **Solución:** aceptar el URL parseado solo si el path es una ruta conocida (`/consumo|/enviar|/acuerdo`); si no, caer a los fallbacks sobre el texto crudo. Detectado por los tests de `qrParse` al primer run.
19. **BigInt literals rompen `tsc --noEmit` con target <ES2020** — `10n ** 18n` en tests → TS2737/TS2791. **Solución:** `BigInt('…')` en lugar de literales (el tsconfig de Next no se toca).
