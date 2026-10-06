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
