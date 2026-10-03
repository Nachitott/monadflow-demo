# SPECS: Componentes Modo 1 (Pay-per-use Stream)

Especificaciones técnicas para los componentes del flujo de streaming de pagos por tiempo.

---

## ⏱️ 1. LiveStreamTimer (`LiveStreamTimer.tsx`)
Reloj contador dinámico en tiempo real que refleja la sesión activa de consumo.

* **Props:**
  * `sessionId` (`string`): Identificador único de la sesión (`bytes32`).
  * `ratePerSecond` (`number`): Tarifa en ARS/USD por segundo transcurrido.
  * `maxCap` (`number`): Límite máximo autorizado por el usuario (`Auto-cap`).
  * `startTime` (`number`): Timestamp Unix del inicio de la sesión.
* **Hooks Integrados:**
  * `useTimeStreamTimer`: Hook personalizado que calcula la diferencia en segundos `(Date.now() - startTime)` e incrementa el costo acumulado en tiempo real.
* **Render:**
  * Cronómetro activo (`00:00:00`) con fuente `font-mono`.
  * Barra de progreso porcentual del gasto acumulado respecto al `maxCap`.

---

## 🛑 2. MerchantKillswitchModal (`MerchantKillswitchModal.tsx`)
Modal de emergencia para que el comercio desactive instantáneamente la recepción de nuevos ingresos por QR.

* **Props:**
  * `merchantAddress` (`string`): Identificador del establecimiento.
  * `isOpen` (`boolean`): Control de visibilidad.
  * `onClose` (`() => void`): Callback de cancelación.
  * `onConfirmDeactivation` (`() => void`): Invocación a la función `deactivateQR` del contrato `TimeStream.sol` (killswitch por address de comercio).
* **Estilo & UX:**
  * Botones en color rojo carmesí (`rose-600` / `red-500`).
  * Mensaje de confirmación: *"¿Desactivar código QR del establecimiento? No se permitirán nuevos ingresos hasta reactivarlo"*.

---

## 📊 3. StreamSummaryCard (`StreamSummaryCard.tsx`)
Tarjeta desplegada al finalizar una sesión de consumo.

* **Props:**
  * `totalDurationSeconds` (`number`): Duración total en segundos.
  * `totalPaid` (`number`): Monto exacto debitado.
  * `refundedAmount` (`number`): Devolución automática del sobrante no consumido `(maxCap - totalPaid)`.
* **Render:**
  * Desglose financiero transparente con animación de finalización (icono Check verde).

---

## 🔗 Enlaces y Relaciones
- Contrato Inteligente: [[Modelado_SmartContracts]]
- Flujo de Pantalla: [[WIREFRAMES_FLOW]]
- Componentes Comunes: [[COMMON_COMPONENTS]]