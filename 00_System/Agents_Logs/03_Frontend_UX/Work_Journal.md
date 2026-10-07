# Work Journal

BitÃ¡cora de trabajo para este perfil.

## 2026-10-03 — Agente 03 (Frontend UX) — Fase 1 completada
- Scaffold del proyecto Next.js 14 (App Router + TypeScript) en `03_Frontend_Terminal/app/` con Tailwind CSS y Lucide Icons.
- Configuración Web3: `src/lib/chains.ts` (Monad Testnet, chainId 10143) y `src/lib/wagmi.ts` (wagmi + http RPC).
- Autenticación invisible con Privy: `providers.tsx` (login social Google/Apple/email, embedded account on-login, sin modales de conexión), `LoginScreen.tsx` y `HeaderUserBar.tsx` (perfil de usuario sin direcciones 0x).
- Capa ERC-4337: `src/lib/aa.ts` con EntryPoint v0.6, bundler/paymaster por variables de entorno y política de session keys (firmas silenciosas 24h).
- `npm run build` limpio (0 errores, 0 warnings). Pendiente: `NEXT_PUBLIC_PRIVY_APP_ID` real para habilitar login en runtime (ver `.env.example`).
- Configurado `NEXT_PUBLIC_PRIVY_APP_ID` real en `.env.local` y levantado `npm run dev` en `http://localhost:3000` — GET / responde 200, login social operativo.
- Repo inicializado y pusheado a GitHub (`Nachitott/monadflow-demo`): `main` + ramas por dominio; `feat/frontend-app` y `feat/landing-page` mergeadas a `main`. Deploy Vercel activo.
- **Mejoras Fase 3:** escáner QR real con `html5-qrcode` (cámara trasera, fallback "ingresar sin escanear" para desktop/HTTP sin contexto seguro). `regenerateQr` ahora cierra todas las sesiones activas (`endAllActiveSessions` cobra solo lo consumido); el cliente detecta el cierre vía storage events y recibe resumen + devolución del tope no usado. Seed demo ejecuta una sola vez. Mergeado a `main`.
- **Fase 3 completada:** `/consumo` (escaneo → auto-cap → sesión en vivo → resumen con devolución) y `/comercio` (grilla de clientes en vivo, refresco 1m/5m/15m/manual, cierre de jornada exportable a CSV). QR real del comercio con `qrcode.react` → link `/consumo?m=<qrId>`; killswitch desactiva el código y el comercio puede **generar un QR nuevo desde cero** (`lib/merchant.ts`, `MerchantKillswitchModal`). Sesiones compartidas vía `streamSessions.ts` (localStorage + storage events) para demo multi-pestaña. Build limpio, mergeado a `main` (redeploy Vercel).
- `BalanceContext` (`src/lib/BalanceContext.tsx`): saldo ARS/USD persistido en `localStorage` con clave por usuario de Privy (`monadflow:balance:<userId>`) — cada cuenta mantiene su propio saldo entre sesiones. Base del store compartido para Fases 3-4; reemplazable por lectura on-chain en Fase 5. Pusheado a `feat/frontend-app` y mergeado a `main`.
- **Fase 2 completada:** `useExchangeRate` (cotización simulada ARS↔USD, refresco 30s), `BalanceCard` con selector de moneda, `FiatRampModal` (Mercado Pago/CVU, acreditación optimista 1.2s), saldos duales ARS+USD en dashboard. Build limpio; pusheado a `feat/frontend-app` y mergeado a `main` (redeploy automático en Vercel).

* [Volver al Contexto Maestro](../../CONTEXTO_MAESTRO.md)

## 2026-10-04 — Agente 03 (Frontend UX) — Fix cross-device QR (Fase 3 hardening)
- **Bug:** QR del comercio rechazado como inválido al escanear desde otro dispositivo. Causa: estado en localStorage (por dispositivo) — el celular generaba su propio `qrId` y fallaba la validación.
- **Solución:** estado compartido server-side in-memory — `lib/server/store.ts` + API routes `/api/merchant`, `/api/sessions`, `/api/sessions/[id]`. Cliente en `lib/api.ts`; `merchant.ts`/`streamSessions.ts` reducidos a shim/tipos. Polling 2s en `/comercio` (sesiones+merchant) y en `/consumo` (cierre remoto de sesión al regenerar QR).
- Regenerar QR: invalida el anterior, cierra todas las sesiones activas server-side (cobra lo consumido) y el cliente ve su resumen con devolución automáticamente.
- Primera interacción limpia: sin seed de clientes demo ni "Cowork Central" (nombre default "Mi comercio", editable desde el panel).
- `QRScanner` agrandado (h-80, max-w-sm, qrbox 260px).
- Verificado: build limpio; API end-to-end (POST sesión → regenerate → sesión cerrada con `totalPaid`); `/`, `/consumo`, `/comercio` 200.
- Nota: el store in-memory cubre la demo en un mismo proceso (incluye Vercel single-instance en dev); no es persistencia durable multi-instancia — Fase 5 lo reemplaza por estado on-chain.

## 2026-10-04 — Agente 03 (Frontend UX) — KV store + UX de tope y tarifa
- Migrado el estado compartido a **Upstash Redis (KV REST)** (`lib/server/db.ts`, `store.ts` async) — elimina el QR rotativo y códigos "revividos" entre instancias de Vercel. Fallback in-memory en local.
- `/comercio`: tarifa editable por hora (`update.ratePerMinute`); nombre editable conservado.
- `/consumo`: botón "Iniciar consumo" sticky siempre visible; tope libre + "Usar todo mi saldo" + aviso con "Ajustar a $X" cuando el tope supera el saldo.
- Verificado: dos procesos dev distintos devuelven el mismo `qrId` desde KV; flujo POST sesión → regenerate → cierre con `totalPaid`. Build limpio; rutas 200.
- Requiere envs `KV_REST_API_URL`/`KV_REST_API_TOKEN` configuradas en Vercel.

## 2026-10-04 — Agente 03 (Frontend UX) — Sesión única + banner persistente
- `SessionState.userId` (Privy id): `POST /api/sessions` devuelve 409 + sesión existente si el usuario ya tiene consumo abierto — re-escanear el QR reanuda, nunca duplica.
- `/consumo`: al montar, `fetchMyActiveSession(user.id)` reanuda consumo abierto (sin re-reservar tope). "Finalizar consumo" ahora sticky `bottom-4`.
- Nuevo `ActiveSessionBanner` en home: consumo en curso siempre visible con cronómetro y acumulado en vivo, linkea a `/consumo`.
- API: `GET /api/sessions?user=<id>&active=1`.

## 2026-10-05 — Agente 03 (Frontend UX) — Fase 4 completada (Modo 2)
- Modelo `AgreementState` en `lib/server/store.ts` (KV `mf:agreements`, fallback memoria): título, monto, moneda, N etapas (split parejo), auto-aprobación en días, killswitch de enlace pre-depósito, ciclo pending→active→completed/cancelled.
- API: `POST /api/agreements` (crear), `GET /api/agreements?contractor|client`, `GET/POST /api/agreements/[id]` con acciones `deposit`, `deliver`, `approve`, `cancel`, `deactivate/reactivate-link`. Regla `stage0_locked`: cancelación solo tras liberar etapa 1. Auto-aprobación perezosa por `autoApproveDays` en cada GET/POST.
- Componentes según spec: `components/escrow/{MilestoneTracker,ApproveStageButton,CancelEscrowModal}.tsx`.
- `/acuerdo`: panel del contratista — wizard de creación con preview por hito, QR `/acuerdo/<id>`, killswitch de enlace, "Entregar etapa N".
- `/acuerdo/[id]`: vista cliente — depósito del 100% (reserva de saldo), banner de custodia, aprobar en 1-clic sobre etapa entregada, cancelación con reembolso exacto de etapas no aprobadas. Timer de auto-aprobación visible.
- Home: acceso "Acuerdos por etapas". Build limpio; flujo API end-to-end verificado (deposit → stage0_locked → approve → cancel); rutas 200.

## 2026-10-05 — Agente 03 (Frontend UX) — Fase 4 hardening (luz verde + secciones)
- Gate de continuación: `AgreementStage.authorizedAt` — `deposit` autoriza la etapa 1; `authorize-next` del cliente habilita la siguiente; `deliver` exige autorización (403 `stage_not_authorized`); `cancel` bloqueado mientras haya etapa autorizada/entregada sin aprobar (409 `work_session_active`).
- `/acuerdo`: tabs "Creados por mí" / "Como cliente", historial colapsable por rol, eliminar (solo pending/completed/cancelled), "Entregar etapa" deshabilitado con "Esperando luz verde".
- `/acuerdo/[id]`: tarjeta "Dar luz verde" con aviso de pago comprometido; copy de cancelación por estado (pre-etapa-1 / sesión de trabajo / disponible).
- `MilestoneTracker`: badge "Autorizada" (ámbar, Lock).
- Verificado end-to-end: 403 sin autorización, 409 con entrega en revisión, cancel entre etapas OK, delete en cerrado OK.

## 2026-10-05 — Agente 03 (Frontend UX) — Fase 5 completada (Modo 3 P2P)
- Spec `01_Architecture/Transferencias_P2P.md`: envío por alias/QR con comprobante, seam `useTransfers` para migración on-chain sin tocar UI.
- **Balances server-side:** `mf:balances` en KV + `/api/balances` (GET devuelve `null` sin registro → POST `mode:'seed'` migra una-sola-vez desde localStorage; POST `delta` aplica cambio). `BalanceContext` ahora server-authoritative: localStorage = caché de pintura instantánea, refetch en `window.focus`, `refreshBalances()` expuesto. El saldo sigue al usuario entre dispositivos; carga fiat / reservas / pagos de consumo persisten sin cambios en esos flujos.
- **Aliases:** `mf:aliases` + `/api/aliases` (GET `?alias=` resolución / `?user=` propio; POST registro único case-insensitive, `alias_taken` 409, regex `^[a-z0-9][a-z0-9._-]{2,24}$`).
- **Transfers:** `mf:transfers` + `/api/transfers` (GET `?user=` historial enviados+recibidos; POST valida alias existe → `alias_not_found` 404, no self → `self_transfer` 400, monto>0, saldo suficiente → `insufficient_funds` 402; débito+crédito en `mf:balances` + record `status:'completed'`). `/api/transfers/[id]` para comprobante.
- **UI `/enviar`:** tabs Enviar/Recibir — flujo 3 pasos (alias con resolución en vivo debounce + escaneo QR `?to=<alias>` → monto + cartera ARS/USD + nota → `TransferReceipt` "Comprobante #ID"), `MyReceiveQR` con registro de alias inline, `TransferHistoryList` con dirección ±.
- `QRScanner`: prop `parse` opcional (default sigue leyendo `?m=`). Accesos: tarjeta home + botón en `BalanceCard`.
- Verificado: build limpio (ruta `/enviar` + 4 API routes nuevas); flujo API end-to-end (seed → alias → transfer → débito/crédito → historial → 4 errores); rutas 200.
