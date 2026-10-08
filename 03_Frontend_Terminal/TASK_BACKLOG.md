# TASK BACKLOG: Frontend (Next.js + Tailwind CSS + Viem/Wagmi)

## 🎯 Prioridad y Estado General
- [x] Fase 1: Setup del Proyecto, Web3 Core (Privy/Wagmi) y UI Base
- [x] Fase 2: Autenticación Invisible y Widget Simulador Fiat (ARS/USD)
- [x] Fase 3: UI/UX Modo 1 (Pay-per-use Stream & Live Dashboard)
- [x] Fase 4: UI/UX Modo 2 (Milestone-Lock Escrow & Contrataciones)
- [x] Fase 5: Transferencias P2P (Modo 3 — backend intercambiable)
- [ ] Fase 6: Conexión con Smart Contracts y Animaciones en Tiempo Real

---

## 📱 Fase 1: Setup & Web3 Invisible ✅
- [x] **Configuración de Proyecto:**
  - Inicializar Next.js (App Router), Tailwind CSS y Lucide Icons. → `03_Frontend_Terminal/app/` (Next 14 + TS + Tailwind).
  - Configurar proveedor RPC de Monad Testnet en Viem / Wagmi → `src/lib/chains.ts` + `src/lib/wagmi.ts` (chain 10143).
- [x] **Autenticación Invisible (Privy / Web3Auth):**
  - Implementar flujo de Login Social (Google, Apple, Email; passkey disponible vía Privy en runtime) omitiendo modales tradicionales de conexión de billeteras → `LoginScreen.tsx`, `providers.tsx`.
  - Ocultar la dirección pública (0x...) bajo un perfil de usuario (Email / Nombre) → `HeaderUserBar.tsx` muestra nombre/email, nunca la dirección.
- [x] **Session Keys & Paymaster (ERC-4337):**
  - Configurar abstraído de gas para que toda transacción sea $0 de costo percibido para el usuario → `src/lib/aa.ts` (EntryPoint v0.6 + bundler/paymaster por env).
  - Habilitar claves de sesión para firmas silenciosas durante el inicio/cierre de consumo → política de session key (24h) definida en `aa.ts`; integración efectiva pendiente de ABIs (Fase 5).

---

## 💵 Fase 2: Visualización Multimoneda & Simulación Fiat (ARS/USD) ✅
- [x] **Ticker en Tiempo Real:**
  - Selector para alternar visualización entre ARS ($) y USD → integrado en `BalanceCard.tsx`.
  - Hook `useExchangeRate` → `src/lib/useExchangeRate.ts` (cotización simulada, refresco c/30s, conversión ARS↔USD, `formatAmount` es-AR).
- [x] **Modal Simulador Mercado Pago / CVU:**
  - Formulario desplegable para ingresar Pesos Argentinos (ARS) o USD → `FiatRampModal.tsx` (montos rápidos, alias `monadflow.mp`).
  - Botón "Cargar Saldo" con animación de procesamiento instantáneo que acrecienta el balance → acreditación optimista en 1.2s, doble saldo ARS/USD en `page.tsx`.

---

## ⏱️ Fase 3: Modo 1 (Pay-per-use Stream) ✅
- [x] **Vista Cliente (Consumidor):** → `/consumo`
  - Componente Escáner QR / Lectura de enlace de comercio (resuelve `?m=<qrId>` generado por el comercio).
  - Formulario de ajuste de límite máximo (`Auto-cap`) en ARS antes de iniciar (valida saldo).
  - Pantalla de sesión activa con contador dinámico en vivo (`LiveStreamTimer`, tick 250ms) que incrementa segundos y monto acumulado en tiempo real + barra de progreso del cap.
  - Botón "Finalizar Consumo" con confirmación instantánea en 1-clic → `StreamSummaryCard` con devolución del saldo no usado.
- [x] **Vista Comercio (Live Merchant Dashboard):** → `/comercio`
  - Grilla responsiva con tarjetas de clientes activos, minutos transcurridos y gasto parcial.
  - Controles de frecuencia de actualización (1m, 5m, 15m, Manual 🔄).
  - QR real del comercio (`qrcode.react`, link `/consumo?m=<qrId>`) + **Killswitch** que desactiva el código y opción de **generar código nuevo desde cero** (`MerchantKillswitchModal` + `lib/merchant.ts`).
  - Modal exportable de "Reporte de Cierre Diario" (CSV real descargable).
- [x] **Hardening cross-device:** estado compartido en API routes in-memory (`/api/merchant`, `/api/sessions`, `lib/server/store.ts` + `lib/api.ts`) — el QR generado en un dispositivo valida al escanearse desde otro. Regenerar QR cierra todas las sesiones activas (cliente recibe su resumen con devolución vía polling). Sin seeds/demo: primera interacción limpia, nombre de comercio editable. Escáner de cámara real agrandado (`html5-qrcode`).

---

## 📝 Fase 4: Modo 2 (Milestone-Lock Escrow) ✅
- [x] **Creador de Contrato (Contratista):** → `/acuerdo`
  - Formulario: Título, Monto Total, Cantidad de Etapas, Moneda (ARS/USD) y Días para Auto-Aprobación.
  - Vista previa del monto por cada hito (split parejo) antes de crear.
  - QR instantáneo (`qrcode.react`, link `/acuerdo/<id>`) + killswitch del enlace previo al depósito (desactivar/reactivar).
  - Acción "Entregar etapa" por hito (activa el timer de auto-aprobación server-side).
- [x] **Vista Cliente / Aprobador:** → `/acuerdo/[id]`
  - `MilestoneTracker`: banner de custodia ("$X protegidos en el fondo de garantía") + lista de etapas con badges (`Completado`, `En revisión`, `En proceso`, `Pendiente`).
  - `ApproveStageButton` (1-clic, "Aprobar y liberar $X") sobre la etapa entregada.
  - `CancelEscrowModal`: reembolso del 100% de etapas no aprobadas — **habilitado solo tras pagar la Etapa 1** (regla del Contexto Maestro, forzada server-side con `stage0_locked`).
  - Depósito del 100% con reserva de saldo del cliente (`updateBalance`), reembolso al cancelar.
  - Auto-aprobación perezosa por `autoApproveDays` en `/api/agreements/[id]`.
- [x] **Backend compartido:** `/api/agreements` + `/api/agreements/[id]` sobre KV (`mf:agreements`) — estado consistente cross-device.

---

## 📤 Fase 5: Transferencias P2P (Modo 3) ✅
> Spec completo: `01_Architecture/Transferencias_P2P.md`. Implementado sobre la capa mock existente — la ejecución queda encapsulada detrás de `useTransfers` para migración post-MVP sin tocar UI.

- [x] **Store & API (backend mock):**
  - `src/lib/server/store.ts`: keys `mf:transfers` + `mf:aliases` (+ `mf:balances` server-side) con helpers completos.
  - `POST/GET /api/transfers` + `GET /api/transfers/[id]` (débito+crédito, validación de saldo `insufficient_funds`, `alias_not_found`, `self_transfer`, `status: 'completed'` inmediato).
  - `GET/POST /api/aliases` (resolución `?alias=` → destinatario; registro de alias propio único, `alias_taken` 409).
  - `GET/POST /api/balances` — balances por usuario en KV (delta + seed de migración una-sola-vez desde localStorage).
- [x] **Balances server-side:** `BalanceContext` ahora es server-authoritative (KV `mf:balances`) con localStorage como caché de pintura instantánea, refetch en `focus` y `refreshBalances()` expuesto — el saldo sigue al usuario entre dispositivos.
- [x] **Hook único `useTransfers`:** `send(to, amount, currency, note?)`, `resolveAlias(alias)`, `registerAlias`, `history` — seam para la migración on-chain (Fase 6).
- [x] **Vista `/enviar` (cliente):** tabs Enviar/Recibir.
  - Paso 1: input alias con resolución en vivo (debounce) + botón escanear QR (`QRScanner` con prop `parse`; QR personal con `?to=<alias>`).
  - Paso 2: monto es-AR + selector de cartera `ARS | USD` + nota opcional + validación contra saldo.
  - Paso 3: confirmar 1-clic → `TransferReceipt` con "Comprobante #ID" (nunca hash).
  - Componentes nuevos en `components/p2p/`: `SendMoneyForm`, `MyReceiveQR`, `TransferReceipt`, `TransferHistoryList`.
- [x] **Mi QR de cobro:** QR personal en tab "Recibir" (`qrcode.react`) con link `/enviar?to=<alias>` + registro de alias inline + copiar alias.
- [x] **Accesos:** tarjeta "Enviar dinero" en home + botón "Enviar dinero" en `BalanceCard`.
- [x] **Coherencia de reglas:** P2P usa la misma capa mock de balances que los demás modos — sin dinero real mezclado con simulado.

---

## � Fase 5.5: Home según boceto `MonadFlow_Inicio.png` ✅
- [x] **Recomposición de `/`:** header + card de saldo + historial + bottom nav (elimina grilla de cards y FAB "Cargar saldo").
- [x] **BalanceCard:** fila `Alias:` (link a `/enviar?tab=receive`) + acciones `Transferir` / `Cargar saldo` (`onTopUp`).
- [x] **BottomNav:** `Por uso` → `/consumo`, `Etapas` → `/acuerdo`, QR central = **escáner universal** (overlay con `QRScanner`; navega a `/consumo?m=`, `/enviar?to=` o `/acuerdo/[id]` según el QR).
- [x] **Historial unificado:** `GET /api/activity?user=` agrega transfers ±, sesiones cerradas, depósitos a fondo de garantía, etapas liberadas y reembolsos; depósitos fiat se loggean en `mf:activity` vía `reason:'deposit'` en `/api/balances`. Componente `ActivityList` con "Comprobante #id".
- [x] **Acceso comercio:** ícono `Store` en `HeaderUserBar` → `/comercio`.

---

## �🎨 Fase 6: Componentes de Interfaz & Pulido Visual
- [ ] Aplicar diseño Mobile-First enfocado en usabilidad en smartphones.
- [ ] Sanitización estricta de textos: Garantizar cero uso de términos como "Gas", "Hex", "Hash", "USDC" o "Wallet" en la interfaz.
- [ ] Migración de la ejecución de `useTransfers` al `transfer` ERC-20 (o `TransferHub.sendTo`) junto con el resto de la integración on-chain.
- [ ] Pruebas de integración con los ABIs reales generados en `02_SmartContracts_Terminal/ABIs/`.