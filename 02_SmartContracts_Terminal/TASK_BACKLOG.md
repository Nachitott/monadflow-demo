# TASK BACKLOG: Smart Contracts (Solidity / Monad Devnet)

> **Versión 2.1** — Alineado al spec revisado en `01_Architecture/Modelado_SmartContracts.md`. Referencia única de verdad para firmas, structs y reglas de acceso.
> v2.1: agregado Módulo Entorno (setup real ejecutado) + decisiones de diseño cerradas en §Decisiones.

## 🎯 Prioridad y Estado General
- [x] Fase 0: Capa de Moneda (MockUSDC / MockARS / MockExchange)
- [x] Fase 1: Entorno de Desarrollo y Estructuras Core
- [x] Fase 2: Implementación de TimeStream.sol (Modo 1)
- [ ] Fase 3: Implementación de MilestoneEscrow.sol (Modo 2)
- [ ] Fase 4: Killswitch, Account Abstraction y hooks del Agente Orquestador
- [ ] Fase 5: Pruebas de Carga en Foundry y Exportación de ABIs

---

## 📌 Módulo Entorno (Fase 1) — ✅ Completado 2026-10-09
- [x] `foundry.toml` (solc `0.8.28`, pragma de contratos `^0.8.24`, `rpc_endpoints.monad_testnet`).
- [x] Dependencias vendored en `lib/` vía `forge install --no-git` (soldeer inaccesible — registry no resuelve):
  - `@openzeppelin-contracts` **v5.6.1** (tag fijado — OZ v5: `Ownable(msg.sender)` en constructor).
  - `forge-std` **v1.9.7** (tag fijado).
- [x] `remappings.txt`: `@openzeppelin/contracts/` y `forge-std/` resueltos.
- [x] `.gitignore` local (`out/`, `cache/`, `broadcast/`, `lib/`, `.env*`).
- [x] Estructura `src/types/`, `test/`, `script/` + enum base `CurrencyType.sol`.
- [x] Smoke test: `forge build` compila limpio.
- **Nota Windows:** `forge` no está en PATH → usar `~/.foundry/bin/forge.exe` (o `export PATH="$HOME/.foundry/bin:$PATH"`).
- **Nota git:** el workspace raíz ES repo git (`Nachitott/monadflow-demo`); `lib/` queda vendored e ignorado (no submodules).

## 🧭 Decisiones de diseño cerradas (v2.1)
1. **Currency mismatch en `startStream`:** si `currency` pedida ≠ `rateCurrency` del registry → **revert** (el usuario convierte antes vía `MockExchange`; sin conversión implícita).
2. **`deliverStage` secuencial:** exige `stageIndex == currentStage` — hace inequívoco el timer de auto-release y la disputa.
3. **`autoReleaseDays == 0` → timer deshabilitado:** `claimAutoRelease` requiere `autoReleaseSeconds > 0` (evita liberación instantánea post-entrega).
4. **Voucher EIP-712 stateless:** `RateVoucher` se decodifica de `bytes calldata` (`ratePerSecond, currency, expiresAt, qrNonce, signature`); sin replay-guard — habilita tarifa promo hasta `expiresAt`. Documentado como aceptable para MVP.
5. **Deploy a testnet pendiente:** `script/Deploy.s.sol` se escribe en Fase 5; el despliegue real requiere `PRIVATE_KEY` fondeada con MON (faucet) — no disponible aún.

---

## 📌 Módulo 0: Capa de Moneda (Tokens + Exchange) — ✅ Completado 2026-10-13
- [x] **`MockUSDC.sol`** (`src/tokens/`): ERC-20 OZ v5, 6 decimales, `mint(to, amount)` público (faucet demo).
- [x] **`MockARS.sol`** (`src/tokens/`): ERC-20 OZ v5, 18 decimales, `mint(to, amount)` público (faucet demo).
- [x] **`MockExchange.sol`** (`src/`):
  - `arsPerUsd` (escala 1e18) admin-settable + `setRate` (Ownable OZ v5, deployer = owner). Evento `RateUpdated`.
  - `swapUSDCforARS(amountUsdc)` / `swapARSforUSDC(amountArs)` con `SafeERC20.transferFrom` + `mint` del token destino directo al usuario (pool infinito simulado).
  - Evento `Converted(user, fromCurrency, toCurrency, amountIn, amountOut, rateApplied)` — indexed en user + currencies.
  - `ReentrancyGuard` en swaps (spec §4). Revert `InvalidAmount` si input u output == 0 (dust).
  - Limitación documentada en NatSpec: rate fijo admin, liquidez simulada, tokens origen acumulados en el contrato.
- [x] Enum compartido `CurrencyType { ARS, USD }` en `src/types/` — inyectado por dirección de token en constructores.
- [x] `test/MockExchange.t.sol`: 13 tests, 100% pass — swaps ambos sentidos, math de decimales (1e6↔1e18), setRate solo owner, eventos, reverts (rate 0, address 0, amount 0, dust, sin approve). Log en `test_logs/2026-10-13_modulo0_forge_test.log`.

---

## 📌 Módulo 1: TimeStream.sol (Cobro por Uso / Tiempo) — ✅ Completado 2026-10-13
- [x] **Estructuras:**
  - `MerchantProfile { ratePerSecond, rateCurrency, disabled }`.
  - `StreamSession { id, user, merchant, ratePerSecond, maxCap, balanceDeposited, startTime, stopTime, totalPaid, currency, active }`.
- [x] **Registry de tarifas `setRate(ratePerSecond, currency)`:**
  - `msg.sender` = comercio (self-registration). Revert `InvalidRate` si rate == 0. Emite `RateSet`.
- [x] **Función `startStream(merchant, maxCap, currency, voucher)`:**
  - Requiere `!merchants[merchant].disabled` y `maxCap > 0`.
  - Resuelve rate: voucher EIP-712 `RateVoucher` firmado por el merchant (con `expiresAt` + `qrNonce`) **o** `merchants[merchant].ratePerSecond` del registry (revert `RateNotSet` / `CurrencyMismatch`).
  - Voucher funciona aunque el merchant no tenga perfil en registry (promo firmada off-chain).
  - **Escrow por sesión:** `safeTransferFrom(currencyToken, user, this, maxCap)` → `balanceDeposited = maxCap`.
  - Emitir `StreamStarted(sessionId, user, merchant, ratePerSecond, maxCap, currency)`.
- [x] **Función `stopStream(sessionId)`:**
  - Callable por `session.user`, `session.merchant`, o **cualquiera** si `elapsed * rate >= maxCap` (keeper-friendly para el orquestador).
  - CEI: `totalPaid = min(duration * rate, maxCap)` → estado → `safeTransfer(merchant, totalPaid)` + `safeTransfer(user, maxCap - totalPaid)`.
  - `ReentrancyGuard`. Emitir `StreamSettled`.
- [x] **Killswitch por comercio:**
  - `deactivateQR()` / `reactivateQR()` — solo el merchant (`msg.sender`), key = `address`. Revert `NoMerchantProfile` sin `setRate` previo. Bloquea nuevos `startStream`, no las sesiones activas.
- [x] **Optimización Monad Parallel EVM:** mapeos aislados por `bytes32`, sin acumuladores globales.
- [x] **Views extra (soporte dashboard/frontend):** `getSession(id)` (struct completo), `accruedAmount(id)` (min(elapsed·rate, cap) en vivo), `getUserSessions(addr)`, `getMerchantSessions(addr)`.
- [x] **`test/TimeStream.t.sol`: 25 tests, 100% pass** — escrow/refund exacto, stop por user/merchant/tercero-con-cap-agotado, killswitch (bloquea nuevos, no activos), voucher válido/expirado/firmante-inválido/currency-mismatch/sin-perfil, flujo ARS end-to-end, views. Log: `test_logs/2026-10-13_modulo1_forge_test.log`.

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
