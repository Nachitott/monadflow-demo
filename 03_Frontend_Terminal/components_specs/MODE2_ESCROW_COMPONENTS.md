# SPECS: Componentes Modo 2 (Milestone-Lock Escrow)

Especificaciones técnicas para los componentes del flujo de contratos por custodia de hitos.

---

## 📊 1. MilestoneTracker (`MilestoneTracker.tsx`)
Visualizador del progreso del proyecto y estado de la garantía congelada.

* **Props:**
  * `projectId` (`string`): Identificador del contrato.
  * `stages` (`Array<{ description: string, amount: number, isApproved: boolean }>`): Lista de etapas.
  * `currentStage` (`number`): Índice de la etapa activa.
* **Render:**
  * Banner superior destacado: *"100% de los fondos congelados en garantía seguro"*.
  * Lista vertical de hitos con badges visuales: `Completado` (Verde), `En Proceso` (Azul Cyan), `Pendiente` (Gris).

---

## ⚡ 2. ApproveStageButton (`ApproveStageButton.tsx`)
Botón de aprobación rápida en 1-clic para liberar el pago del hito finalizado.

* **Props:**
  * `projectId` (`string`): Identificador del proyecto.
  * `stageIndex` (`number`): Etapa a aprobar.
  * `stageAmount` (`number`): Monto a transferir al contratista.
  * `onApprovedSuccess` (`() => void`): Callback de actualización de estado.
* **Comportamiento UX:**
  * Ejecuta la transacción en segundo plano mediante Session Key / Paymaster (Gasless).
  * Texto en pantalla: *"Aprobar y Liberar Pago"*. Sin ventanas emergentes solicitando firmas de transacciones.

---

## 🔄 3. CancelEscrowModal (`CancelEscrowModal.tsx`)
Modal para la rescisión del contrato con reembolso inmediato de etapas no ejecutadas.

* **Props:**
  * `projectId` (`string`): Identificador del proyecto.
  * `remainingRefundAmount` (`number`): Cálculo exacto de las etapas aún no aprobadas.
  * `isOpen` (`boolean`): Control de visibilidad.
  * `onClose` (`() => void`): Cancelar acción.
  * `onConfirmCancellation` (`() => void`): Invocación a `cancelProject`.
* **Render:**
  * Muestra el monto total a ser acreditado inmediatamente de vuelta en la cuenta del cliente.

---

## 🔗 Enlaces y Relaciones
- Contrato Inteligente: [[Modelado_SmartContracts]]
- Sistema de Diseño: [[UI_DESIGN_SYSTEM]]
- Componentes Comunes: [[COMMON_COMPONENTS]]