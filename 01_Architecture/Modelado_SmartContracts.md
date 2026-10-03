# Especificación y Modelado de Smart Contracts (Solidity / Monad EVM)

Este documento define la especificación técnica formal, arquitecturas de datos, firmas de funciones y optimizaciones de rendimiento para los Smart Contracts en MonadFlow.

> **Versión 2.0** — Modelado revisado post-auditoría. Decisiones de diseño cerradas: money leg 100% ERC-20, wallets duales ARS/USD con conversión on-chain, escrow por sesión en Modo 1, tarifa del comercio vía registry + voucher EIP-712, política de Etapa 0 intocable en Modo 2, y rol opcional de agente/árbitro para la futura integración del [Agente Orquestador](../06_Agent_Orchestrator/SPEC_ORQUESTADOR.md).

---

## 🛠️ Stack y Entorno de Desarrollo
* **Lenguaje:** Solidity `^0.8.24`
* **Framework:** Foundry (Forge / Cast)
* **Dependencias:** OpenZeppelin Contracts (`IERC20`, `SafeERC20`, `ReentrancyGuard`, `Ownable`, `ECDSA`, `EIP712`)
* **Red Destino:** Monad Devnet / Testnet (`Chain ID: 10143` / RPC oficial Monad)
* **Estándar Account Abstraction:** ERC-4337 (los contratos son **account-agnostic**: operan sobre `msg.sender`, que será la Smart Account del usuario; las Session Keys se validan en la capa de cuenta, **no** dentro de estos contratos)

---

## 💱 0. Capa de Moneda: Tokens ERC-20 y Conversión

Toda la pata de dinero del sistema usa **ERC-20** (`transferFrom` + `SafeERC20`). No se utiliza el token nativo `MON` como pago (solo para gas, patrocinado por el Paymaster).

### `MockUSDC.sol` y `MockARS.sol`

Dos tokens ERC-20 idénticos en estructura que representan las **wallets duales** del usuario. El usuario puede mantener saldo en ambos simultáneamente y convertir entre ellos.

```solidity
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); } // faucet demo
}

contract MockARS is ERC20 {
    constructor() ERC20("Mock ARS", "mARS") {}
    function decimals() public pure override returns (uint8) { return 18; }
    function mint(address to, uint256 amount) external { _mint(to, amount); } // faucet demo
}
```

* **`CurrencyType`** se resuelve por dirección de token, no por enum abstracto: cada contrato de negocio recibe en el constructor `usdcToken` y `arsToken`.
* `mint` público solo para demo/hackathon (documentado como tal; nunca en producción).
* Decimales: USDC `6` (estándar real), ARS `18` (EVM default; evita redondeos en conversiones).

### `MockExchange.sol` (Conversión ARS ↔ USD)

Contrato mínimo que permite al usuario convertir entre sus dos carteras con un tipo de cambio administrado.

```solidity
uint256 public arsPerUsd;        // cuántos mARS vale 1 mUSDC (escala 1e18)
address public owner;            // admin que ajusta el rate (demo)

function setRate(uint256 newArsPerUsd) external;                    // solo owner
function swapUSDCforARS(uint256 amountUsdc) external returns (uint256 amountArs);
function swapARSforUSDC(uint256 amountArs) external returns (uint256 amountUsdc);
```

* **Modelo:** el exchange actúa como pool infinito fondeado por `mint` de ambos tokens (liquidez simulada).
* `swapXforY`: `transferFrom` del token origen → `mint`/transfer del token destino calculado con `arsPerUsd`.
* Evento:
```solidity
event Converted(address indexed user, CurrencyType indexed fromCurrency, CurrencyType indexed toCurrency, uint256 amountIn, uint256 amountOut, uint256 rateApplied);
```
* **Limitación documentada:** rate fijo/admin-settable, no refleja mercado real. Aceptable para la demo; en el futuro se puede reemplazar por un oráculo o ramp real sin tocar TimeStream/MilestoneEscrow.

```solidity
enum CurrencyType { ARS, USD }   // usado por ambos contratos de negocio y el exchange
```

---

## 🟢 1. Contrato: `TimeStream.sol` (Modo 1: Streaming por Tiempo)

Gestiona sesiones de cobro por tiempo para comercios. **Solvencia garantizada por escrow por sesión**: al iniciar, el contrato retiene el `maxCap` completo del usuario; al cerrar, liquida lo consumido y devuelve el sobrante.

### Structs y Enums
```solidity
struct MerchantProfile {
    uint256 ratePerSecond;      // tarifa registrada por el comercio (unidades del token por segundo)
    CurrencyType rateCurrency;  // moneda en que está denominada la tarifa
    bool disabled;              // killswitch
}

struct StreamSession {
    bytes32 id;
    address user;
    address merchant;
    uint256 ratePerSecond;      // rate resuelto al iniciar (registry o voucher) — congelado en la sesión
    uint256 maxCap;
    uint256 balanceDeposited;   // siempre == maxCap (escrow por sesión)
    uint256 startTime;
    uint256 stopTime;
    uint256 totalPaid;
    CurrencyType currency;      // token en que se depositó el escrow
    bool active;
}
```

### Variables de Estado
```solidity
IERC20 public immutable usdcToken;
IERC20 public immutable arsToken;

mapping(bytes32 => StreamSession) public sessions;
mapping(address => MerchantProfile) public merchants;
mapping(address => bytes32[]) public merchantSessions;
mapping(address => bytes32[]) public userSessions;

uint256 private nonce;                       // para derivar sessionId único
bytes32 public constant RATE_VOUCHER_TYPEHASH = keccak256(
    "RateVoucher(address merchant,uint256 ratePerSecond,uint8 currency,uint256 expiresAt,bytes32 qrNonce)"
);
```

### Eventos
```solidity
event RateSet(address indexed merchant, uint256 ratePerSecond, CurrencyType currency);
event MerchantDeactivated(address indexed merchant, uint256 timestamp);
event MerchantReactivated(address indexed merchant, uint256 timestamp);
event StreamStarted(bytes32 indexed sessionId, address indexed user, address indexed merchant, uint256 ratePerSecond, uint256 maxCap, CurrencyType currency);
event StreamSettled(bytes32 indexed sessionId, address indexed user, address indexed merchant, uint256 durationSeconds, uint256 totalPaid, uint256 refunded);
```

### Funciones Principales

#### `setRate` (Registry de tarifas)
```solidity
function setRate(uint256 ratePerSecond, CurrencyType currency) external
```
* **Acceso:** cualquier address se auto-registra como comercio (el comercio es `msg.sender`).
* **Descripción:** publica la tarifa oficial del comercio on-chain. Es la fuente de verdad que usa `startStream` — el cliente **no** puede elegir el precio.

#### `startStream`
```solidity
function startStream(
    address merchant,
    uint256 maxCap,
    CurrencyType currency,
    bytes calldata voucher   // vacío => usar registry
) external returns (bytes32 sessionId)
```
* **Acceso:** cualquier usuario con saldo suficiente (Smart Account via ERC-4337).
* **Descripción:**
  1. Requiere `!merchants[merchant].disabled`.
  2. Resuelve `ratePerSecond`: si `voucher` no está vacío, verifica firma EIP-712 del `merchant` (rate + expiración + `qrNonce`); si está vacío, usa `merchants[merchant].ratePerSecond` y requiere que la moneda del rate coincida con `currency` (o convertir vía exchange — decisión de implementación, documentar).
  3. `safeTransferFrom(currencyToken, msg.sender, address(this), maxCap)` → escrow de sesión.
  4. Crea `StreamSession` con `sessionId = keccak256(user, merchant, nonce++, block.timestamp)`.
* **EIP-712 voucher:** `RateVoucher(merchant, ratePerSecond, currency, expiresAt, qrNonce)` firmado por el merchant. Permite tarifas dinámicas/promos sin tx adicional del comercio.

#### `stopStream`
```solidity
function stopStream(bytes32 sessionId) external returns (uint256 totalPaid)
```
* **Acceso:** `session.user`, `session.merchant`, **o cualquier address** si `elapsed * rate >= maxCap` (auto-agotamiento — evita fondos atrapados si el cliente abandona).
* **Descripción (CEI):**
  1. `duration = block.timestamp - startTime`; `totalPaid = min(duration * ratePerSecond, maxCap)`.
  2. `active = false`, `stopTime = now`, `totalPaid` persistido **antes** de transferir.
  3. `safeTransfer(currencyToken, merchant, totalPaid)` y `safeTransfer(currencyToken, user, maxCap - totalPaid)`.
* `ReentrancyGuard` aplicado.

#### `deactivateQR` / `reactivateQR` (Killswitch)
```solidity
function deactivateQR() external
function reactivateQR() external
```
* **Acceso:** el comercio (`msg.sender` con `MerchantProfile` existente).
* **Alcance:** por **address de comercio** (unificado). Bloquea nuevos `startStream`; las sesiones activas siguen hasta su cierre natural.

---

## 🔵 2. Contrato: `MilestoneEscrow.sol` (Modo 2: Custodia por Hitos)

Custodia con depósito del 100% upfront, liberación por etapas, timer de auto-aprobación, disputas con árbitro opcional y **política de Etapa 0 intocable**.

### Structs y Enums
```solidity
enum ProjectStatus { Active, Completed, Cancelled, Disputed }

struct Milestone {
    string description;
    uint256 amount;
    uint256 deliveredAt;   // 0 = no entregado; arranca el timer de auto-release
    uint256 approvedAt;    // 0 = no aprobado/pagado
}

struct Project {
    bytes32 id;
    address client;
    address contractor;
    address agent;         // árbitro opcional; address(0) = sin agente
    uint256 totalAmount;
    CurrencyType currency;
    uint8 totalStages;
    uint8 currentStage;
    uint32 autoReleaseSeconds;   // autoReleaseDays * 86400 al crear
    uint256 createdAt;
    ProjectStatus status;
}
```

### Variables de Estado
```solidity
IERC20 public immutable usdcToken;
IERC20 public immutable arsToken;

mapping(bytes32 => Project) public projects;
mapping(bytes32 => Milestone[]) public projectMilestones;
```

### Eventos
```solidity
event ProjectCreated(bytes32 indexed projectId, address indexed client, address indexed contractor, address agent, uint256 totalAmount, CurrencyType currency);
event StageDelivered(bytes32 indexed projectId, uint8 stageIndex, uint256 deliveredAt);
event StageApproved(bytes32 indexed projectId, uint8 stageIndex, uint256 amountPaid);
event ProjectDisputed(bytes32 indexed projectId, uint8 stageIndex, address indexed raisedBy);
event DisputeResolved(bytes32 indexed projectId, uint8 stageIndex, uint256 contractorPaid, uint256 clientRefunded);
event ProjectCancelled(bytes32 indexed projectId, uint256 refundedAmount);
event AutoReleased(bytes32 indexed projectId, uint8 stageIndex, uint256 amountPaid);
event ProjectCompleted(bytes32 indexed projectId);
```

### Funciones Principales

#### `createProject`
```solidity
function createProject(
    address contractor,
    address agent,                        // address(0) permitido
    uint8 totalStages,
    uint32 autoReleaseDays,
    CurrencyType currency,
    string[] calldata stageDescriptions,
    uint256[] calldata stageAmounts
) external returns (bytes32 projectId)
```
* **Acceso:** el cliente (`msg.sender`).
* **Descripción:**
  1. Requiere `totalStages > 0`, `stageDescriptions.length == totalStages == stageAmounts.length`.
  2. `total = sum(stageAmounts)`; `safeTransferFrom(currencyToken, msg.sender, address(this), total)` → depósito del 100% congelado.
  3. Crea el proyecto en estado `Active`. La **Etapa 0 queda habilitada para trabajo pero intocable**: no puede cancelarse ni disputarse hasta ser liberada (ver política abajo).

#### `deliverStage` (nuevo — arranca el timer)
```solidity
function deliverStage(bytes32 projectId, uint8 stageIndex) external
```
* **Acceso:** solo `contractor`, proyecto `Active`.
* **Descripción:** marca `milestones[stageIndex].deliveredAt = block.timestamp`. Sin este llamado, `autoRelease` nunca puede ejecutarse — la entrega on-chain es la señal que inicia el reloj de revisión del cliente.

#### `approveStage`
```solidity
function approveStage(bytes32 projectId, uint8 stageIndex) external
```
* **Acceso:** solo `client`, proyecto `Active`, hito `deliveredAt > 0` y `approvedAt == 0`.
* **Descripción (CEI):** marca `approvedAt`, transfiere `amount` al `contractor`, avanza `currentStage`. Si fue la última etapa → `Completed`.
* **Efecto en Etapa 0:** liberar la etapa 0 **habilita `cancelProject` y `disputeStage`** para el resto del proyecto (compromiso bilateral sellado).

#### `cancelProject` (política de Etapa 0 intocable)
```solidity
function cancelProject(bytes32 projectId) external
```
* **Acceso:** solo `client`, proyecto `Active`.
* **Regla de negocio:** **revert si `milestones[0].approvedAt == 0`** — una vez pactado el trabajo, la primera fracción queda comprometida para el contratista; el cliente solo puede cancelar después de haberle pagado esa primera etapa. Reembolsa el **100% del saldo de etapas no aprobadas** al cliente; el contratista conserva lo ya cobrado.

#### `disputeStage` (nuevo)
```solidity
function disputeStage(bytes32 projectId, uint8 stageIndex) external
```
* **Acceso:** `client` o `contractor`, proyecto `Active`, `stageIndex > 0`, hito entregado (`deliveredAt > 0`) y no aprobado.
* **Descripción:** pasa el proyecto a `Disputed`. Bloquea `approveStage`/`cancelProject`/`claimAutoRelease` hasta resolución. Requiere `agent != address(0)` (sin árbitro no hay disputa on-chain; el flujo queda en timer/cancelación).

#### `resolveDispute` (nuevo — hook del Agente Orquestador)
```solidity
function resolveDispute(bytes32 projectId, uint8 stageIndex, uint16 contractorShareBps) external
```
* **Acceso:** solo `project.agent` (y `!= address(0)`), proyecto `Disputed`.
* **Descripción:** reparte `milestones[stageIndex].amount`: `contractorShareBps`/10000 al contractor y el resto al client. Marca el hito como resuelto, devuelve el proyecto a `Active`.
* **Es el punto de entrada del futuro agente intermediario de decisiones** (ver [SPEC_ORQUESTADOR](../06_Agent_Orchestrator/SPEC_ORQUESTADOR.md)).

#### `claimAutoRelease`
```solidity
function claimAutoRelease(bytes32 projectId) external
```
* **Acceso:** **permissionless** (keeper-friendly: cualquier address — incluido el agente orquestador — puede ejecutarlo).
* **Descripción:** si `milestones[currentStage].deliveredAt > 0` y `block.timestamp >= deliveredAt + autoReleaseSeconds`, libera esa etapa al contractor. Proyecto debe estar `Active`.

---

## 🛡️ 3. Matriz de Control de Acceso

| Función | Usuario/Cliente | Comercio/Contractor | Agent | Cualquiera |
|---|:-:|:-:|:-:|:-:|
| `TimeStream.setRate` | — | ✅ (self) | — | — |
| `TimeStream.startStream` | ✅ | — | — | — |
| `TimeStream.stopStream` | ✅ (su sesión) | ✅ (su sesión) | — | ✅ solo si cap agotado |
| `TimeStream.deactivateQR/reactivateQR` | — | ✅ (self) | — | — |
| `MilestoneEscrow.createProject` | ✅ (client) | — | — | — |
| `MilestoneEscrow.deliverStage` | — | ✅ | — | — |
| `MilestoneEscrow.approveStage` | ✅ (client)* | — | — | — |
| `MilestoneEscrow.cancelProject` | ✅ (client, post-etapa-0) | — | — | — |
| `MilestoneEscrow.disputeStage` | ✅ | ✅ | — | — |
| `MilestoneEscrow.resolveDispute` | — | — | ✅ (project.agent) | — |
| `MilestoneEscrow.claimAutoRelease` | — | — | ✅ | ✅ permissionless |
| `MockExchange.setRate` | — | — | — | owner |
| `MockExchange.swap*` | ✅ | ✅ | ✅ | ✅ |

\* `approveStage` también podrá ser ejecutado por una **Session Key** del cliente (delegación vía Smart Account — la firma la produce el agente pero `msg.sender` sigue siendo la cuenta del usuario).

---

## ⚡ 4. Optimizaciones para Monad Parallel EVM

1. **Desacoplamiento de Estado:** cada sesión/proyecto vive bajo un `bytes32` único derivado de `keccak256`. Sin acumuladores globales ni contadores compartidos de fondos.
2. **Registry por merchant:** `merchantRates` keyed por address — dos comercios distintos nunca compiten por el mismo slot.
3. **CEI + `ReentrancyGuard`** solo en funciones con transfers (`stopStream`, `approveStage`, `cancelProject`, `resolveDispute`, `claimAutoRelease`, swaps).
4. **Pull-friendly:** los refunds van al beneficiario directo en la misma tx (montos acotados); si una transferencia ERC-20 falla, la tx revierte entera (consistente con hackathon; documentado).
5. **Account-agnostic:** ningún contrato valida firmas de usuario — solo el voucher EIP-712 del comercio. Session Keys y Paymaster viven en la capa ERC-4337.

---

## 🤖 5. Hooks preparados para el Agente Orquestador (futuro)

Estos puntos quedan abiertos deliberadamente para que el agente intermediario se integre **sin redesplegar contratos**:

| Hook | Mecanismo | Contrato |
|---|---|---|
| Cierre de streams agotados | `stopStream` permissionless cuando `elapsed*rate >= maxCap` | TimeStream |
| Auto-release de hitos vencidos | `claimAutoRelease` permissionless | MilestoneEscrow |
| Arbitraje de disputas | `resolveDispute` restringido a `project.agent` | MilestoneEscrow |
| Aprobación delegada por el usuario | Session Key con scope a `approveStage`/`stopStream` (capa ERC-4337, sin cambios) | Ambos |
| Observabilidad | Todos los eventos llevan `indexed` en actor + id para listeners | Ambos |

---

## 🔗 Archivos Relacionados (Obsidian Graph)
- [Contexto Maestro](../00_System/CONTEXTO_MAESTRO.md)
- [Reglas de Agentes](../00_System/REGLAS_AGENTES.md)
- [Diagrama de Secuencia](Diagrama_Secuencia.md)
- [Integración Frontend](Integracion_Frontend.md)
- [Spec Agente Orquestador](../06_Agent_Orchestrator/SPEC_ORQUESTADOR.md)
- [Perfil Smart Contracts Engineer](../00_System/Agents/02_Smart_Contracts_Engineer_Agent.md)
- [Backlog Smart Contracts](../02_SmartContracts_Terminal/TASK_BACKLOG.md)
- [Guía Monad EVM](../00_System/Skills/monad_parallel_evm_guide.md)
