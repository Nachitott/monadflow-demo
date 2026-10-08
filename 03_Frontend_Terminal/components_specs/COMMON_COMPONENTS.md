# SPECS: Componentes Transversales y Globales

Especificaciones técnicas para componentes comunes reutilizables en toda la aplicación.

---

## 💳 1. BalanceCard (`BalanceCard.tsx`)
Muestra el saldo global del usuario con selector de divisa instantáneo sin parpadeos visuales.

* **Props:**
  * `balanceARS` (`number`): Saldo disponible en Pesos Argentinos.
  * `balanceUSD` (`number`): Saldo equivalente en Dólares Digitales.
  * `activeCurrency` (`'ARS' | 'USD'`): Divisa seleccionada.
  * `onCurrencyToggle` (`(currency: 'ARS' | 'USD') => void`): Callback para alternar moneda.
  * `onTopUp` (`() => void`): Abre el modal de carga de saldo (FiatRampModal).
* **Estados Internos:** Ninguno (Componente controlado). El alias se obtiene internamente vía `useTransfers().myAlias`.
* **Reglas UX & Estilo:**
  * Usar fuente monoespaciada (`font-mono` + `tabular-nums`) en los montos para evitar saltos de layout al alternar.
  * Fila `Alias:` → link a `/enviar?tab=receive` (muestra QR personal); sin alias, copy "Creá tu alias →".
  * Acciones en `grid grid-cols-2`: `Transferir` (primario indigo, → `/enviar`) y `Cargar saldo` (ghost border-slate-700, → `onTopUp`).
  * **Prohibido:** Mostrar decimales en `wei` o sufijos como `USDC` / `ETH`.

---

## 🏦 2. FiatRampModal (`FiatRampModal.tsx`)
Modal de simulación para carga rápida de saldo desde cuentas bancarias o billeteras virtuales.

* **Props:**
  * `isOpen` (`boolean`): Control de visibilidad del modal.
  * `onClose` (`() => void`): Callback de cierre.
  * `onDepositSuccess` (`(amount: number, currency: 'ARS' | 'USD') => void`): Callback ejecutado al confirmar el depósito.
* **Estados Internos:**
  * `amountInput` (`string`): Valor tipeado por el usuario.
  * `isProcessing` (`boolean`): Estado de carga durante la simulación de transferencia.
* **Comportamiento:**
  * Renderiza opciones visuales simuladas ("Alias / CVU Mercado Pago").
  * Al hacer clic en "Confirmar Carga", simula una latencia de 1.2s y actualiza el saldo de forma optimista.

---

## 👤 3. HeaderUserBar (`HeaderUserBar.tsx`)
Barra superior con información de perfil y estado de conexión silenciosa.

* **Props:**
  * `userName` (`string`): Nombre o alias del usuario (obtenido vía Social Login / Passkey).
  * `userAvatar` (`string`): URL del avatar o iniciales.
  * `isConnected` (`boolean`): Estado de la sesión.
* **Comportamiento:**
  * Muestra badge de conexión limpia ("Conectado con Passkey / Google").
  * Sin mostrar hashes de clave pública ni direcciones hexadecimales de 40 caracteres.

---

## 🧭 4. BottomNav (`BottomNav.tsx`)
Barra de navegación fija inferior de la home. ref: `ui_mockups/MonadFlow_Inicio.png`.

* **Props:** Ninguna (self-contained; maneja su propio estado de escáner).
* **Estructura:** `fixed bottom-0`, `max-w-md`, `border-t border-slate-800 bg-slate-950/90 backdrop-blur`, `pb-[env(safe-area-inset-bottom)]`.
  * Izquierda: `Por uso` (icono `Timer`, → `/consumo`).
  * Centro: círculo elevado `h-14 w-14 -mt-5 bg-indigo-600` con `QrCode` — abre overlay de escaneo.
  * Derecha: `Etapas` (icono `Layers`, → `/acuerdo`).
* **Escáner universal:** overlay `z-50 bg-slate-950/95` con `QRScanner` + `parse` custom — cualquier QR del ecosistema codifica un link interno, así que el parse devuelve la ruta destino y `router.push` navega:
  * URL interna `/consumo|/enviar|/acuerdo…` → navega tal cual.
  * `qr-…` crudo → `/consumo?m=…`; alias `^[a-z0-9._-]{3,25}$` → `/enviar?to=…`.
* **Nota:** la pantalla que lo use debe reservar `pb-28` en el contenido para no quedar tapada por la barra.

## 🧾 5. ActivityList (`ActivityList.tsx`)
Feed unificado de movimientos del usuario en la home. ref: `ui_mockups/MonadFlow_Inicio.png` ("Historial de transacciones").

* **Props:** `refreshKey?` (`number`) — al cambiar, refetchea (ej. tras un depósito).
* **Data:** `GET /api/activity?user=<privyId>` — agrega transfers, sesiones cerradas, eventos de acuerdos y depósitos fiat (`mf:activity`). Refetch en `focus`.
* **Item shape:** `{ kind, direction: 'in'|'out', amount, currency, at, label, refId }`.
* **Reglas UX & Estilo:**
  * Ícono por kind: `HandCoins` (carga), `ArrowUpRight`/`ArrowDownLeft` (transferencias), `Timer` (consumo), `ShieldCheck` (acuerdos).
  * Monto firmado `font-mono tabular-nums`: `emerald-300` entrante / `rose-300` saliente.
  * Detalle: `Comprobante #<refId> · dd/mm hh:mm` — nunca hash ni tx id técnico.
  * Filas clickeables: consumo→`/consumo`, escrow→`/acuerdo/[refId]`, transfer→`/enviar`.
  * Máximo 10 filas; estado vacío con `Inbox` + "Todavía no tenés movimientos."

## 🔗 Enlaces y Relaciones
- Guía visual y colores: [[UI_DESIGN_SYSTEM]]
- Mapa de navegación: [[WIREFRAMES_FLOW]]
- Componentes de Streaming: [[MODE1_STREAMING_COMPONENTS]]
- Componentes de Custodia: [[MODE2_ESCROW_COMPONENTS]]