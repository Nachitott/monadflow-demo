# TASK BACKLOG: Smart Contracts (Solidity / Monad Devnet)

> **Versión 2.0** — Alineado al spec revisado en `01_Architecture/Modelado_SmartContracts.md`. Referencia única de verdad para firmas, structs y reglas de acceso.

## 🎯 Prioridad y Estado General
- [ ] Fase 0: Capa de Moneda (MockUSDC / MockARS / MockExchange)
- [ ] Fase 1: Entorno de Desarrollo y Estructuras Core
- [ ] Fase 2: Implementación de TimeStream.sol (Modo 1)
- [ ] Fase 3: Implementación de MilestoneEscrow.sol (Modo 2)
- [ ] Fase 4: Killswitch, Account Abstraction y hooks del Agente Orquestador
- [ ] Fase 5: Pruebas de Carga en Foundry y Exportación de ABIs

---

## 📌 Módulo 0: Capa de Moneda (Tokens + Exchange)
- [ ] **`MockUSDC.sol`:** ERC-20, 6 decimales, `mint(to, amount)` público (faucet demo).
- [ ] **`MockARS.sol`:** ERC-20, 18 decimales, `mint(to, amount)` público (faucet demo).
- [ ] **`MockExchange.sol`:**
  - `arsPerUsd` admin-settable + `setRate` (owner).
  - `swapUSDCforARS(amountUsdc)` / `swapARSforUSDC(amountArs)` con `SafeERC20.transferFrom` + `mint` del token destino.
  - Evento `Converted(user, fromCurrency, toCurrency, amountIn, amountOut, rateApplied)`.
  - Documentar limitación: rate fijo, liquidez simulada (no refleja mercado real).
- [ ] Enum compartido `CurrencyType { ARS, USD }` resuelto por dirección de token inyectada en constructores.

---

## 📌 Módulo 1: TimeStream.sol (Cobro por Uso / Tiempo)
- [ ] **Estructuras:**
  - `MerchantProfile { ratePerSecond, rateCurrency, disabled }`.
  - `StreamSession { id, user, merchant, ratePerSecond, maxCap, balanceDeposited, startTime, stopTime, totalPaid, currency, active }`.
- [ ] **Registry de tarifas `setRate(ratePerSecond, currency)`:**
  - `msg.sender` = comercio (self-registration). Emite `RateSet`.
- [ ] **Función `startStream(merchant, maxCap, currency, voucher)`:**
  - Requiere `!merchants[merchant].disabled`.
  - Resuelve rate: voucher EIP-712 `RateVoucher` firmado por el merchant (con `expiresAt` + `qrNonce`) **o** `merchants[merchant].ratePerSecond` del registry.
  - **Escrow por sesión:** `safeTransferFrom(currencyToken, user, this, maxCap)` → `balanceDeposited = maxCap`.
  - Emitir `StreamStarted(sessionId, user, merchant, ratePerSecond, maxCap, currency)`.
- [ ] **Función `stopStream(sessionId)`:**
  - Callable por `session.user`, `session.merchant`, o **cualquiera** si `elapsed * rate >= maxCap`.
  - CEI: `totalPaid = min(duration * rate, maxCap)` → estado → `safeTransfer(merchant, totalPaid)` + `safeTransfer(user, maxCap - totalPaid)`.
  - `ReentrancyGuard`. Emitir `StreamSettled`.
- [ ] **Killswitch por comercio:**
  - `deactivateQR()` / `reactivateQR()` — solo el merchant (`msg.sender`), key = `address`. Bloquea nuevos `startStream`, no las sesiones activas.
- [ ] **Optimización Monad Parallel EVM:** mapeos aislados por `bytes32`, sin acumuladores globales.

---

## 📌 Módulo 2: MilestoneEscrow.sol (Cobro Garantizado por Etapas)
- [ ] **Estructuras:**
  - `Milestone { description, amount, deliveredAt, approvedAt }`.
  - `Project { id, client, contractor, agent, totalAmount, currency, totalStages, currentStage, autoReleaseSeconds, createdAt, status }`.
  - `ProjectStatus { Active, Completed, Cancelled, Disputed }`.
- [ ] **`createProject(contractor, agent, totalStages, autoReleaseDays, currency, stageDescriptions[], stageAmounts[])`:**
  - `agent` puede ser `address(0)` (sin árbitro → sin disputas on-chain).
  - `safeTransferFrom` del 100% (`sum(stageAmounts)` validado contra largos).
  - Emite `ProjectCreated`.
- [ ] **`deliverStage(projectId, stageIndex)` (nuevo):**
  - Solo `contractor`. Marca `deliveredAt` → arranca el timer de auto-release. Emite `StageDelivered`.
- [ ] **`approveStage(projectId, stageIndex)`:**
  - Solo `client`, hito entregado y no aprobado. Transfiere fracción al `contractor`, avanza `currentStage`, última etapa → `Completed`. Emite `StageApproved`.
- [ ] **`cancelProject(projectId)` — política Etapa 0 intocable:**
  - Solo `client`. **Revert si `milestones[0].approvedAt == 0`** (compromiso sellado: el contratista siempre cobra la primera fracción).
  - Reembolsa 100% de etapas no aprobadas al `client`. Emite `ProjectCancelled`.
- [ ] **`disputeStage(projectId, stageIndex)` (nuevo):**
  - `client` o `contractor`, `stageIndex > 0`, hito entregado y no aprobado, `agent != address(0)` → `Disputed`. Emite `ProjectDisputed`.
- [ ] **`resolveDispute(projectId, stageIndex, contractorShareBps)` (nuevo — hook agente):**
  - Solo `project.agent`. Reparte la fracción disputada. Vuelve a `Active`. Emite `DisputeResolved`.
- [ ] **`claimAutoRelease(projectId)` — permissionless:**
  - Si `deliveredAt + autoReleaseSeconds <= now` en la etapa actual, libera al contractor. Callable por keepers/agente. Emite `AutoReleased`.

---

## 📌 Módulo 3: Killswitch & Admin
- [ ] `MerchantProfile.disabled` (key `address merchant`) en TimeStream — unificado, no por `qrId`.
- [ ] Funciones de desactivación restringidas al merchant (`msg.sender`).
- [ ] `startStream` revierte si el merchant está desactivado.
- [ ] `MockExchange.setRate` restringido a `owner` (Ownable OZ).

---

## 📌 Módulo 4: Account Abstraction (ERC-4337 / Session Keys)
- [ ] Contratos **account-agnostic**: operan sobre `msg.sender` (Smart Account del usuario). NO validar firmas de usuario dentro de los contratos.
- [ ] Session Keys configuradas en la capa de cuenta (ZeroDev/Biconomy) con scopes: `startStream`, `stopStream`, `approveStage` con límites de gasto — firma silenciosa para el usuario y delegación futura al agente.
- [ ] EIP-712 **únicamente** para `RateVoucher` del comercio en `startStream` (ECDSA.recover sobre typed data).
- [ ] Paymaster: todas las ops del usuario gasless.

---

## 📌 Módulo 5: Hooks Agente Orquestador (dejar listo, no implementar servicio)
- [ ] Verificar que `stopStream` (cap agotado) y `claimAutoRelease` sean permissionless para keepers.
- [ ] Rol `agent` por proyecto funcional (`resolveDispute` testeado).
- [ ] Todos los eventos con `indexed` en actor + id (listener-friendly).
- [ ] Referencia: `06_Agent_Orchestrator/SPEC_ORQUESTADOR.md`.

---

## 📌 Módulo 6: Testing & ABIs Output
- [ ] `MockExchange.t.sol`: swaps en ambas direcciones, rate correcto, setRate solo owner.
- [ ] `TimeStream.t.sol`: escrow y refund, cap agotado con stop por tercero, killswitch, voucher válido/expirado/firmante inválido.
- [ ] `MilestoneEscrow.t.sol`: etapa 0 intocable (revert cancel pre-pago), ciclo deliver→approve, auto-release post-timer, dispute→resolve por agent, cancelación post-etapa-0.
- [ ] Generar script de exportación automática de ABIs compiladas hacia `02_SmartContracts_Terminal/ABIs/`.
