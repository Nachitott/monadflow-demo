# Work Journal

Bitácora de trabajo para este perfil.

* [Volver al Contexto Maestro](../../CONTEXTO_MAESTRO.md)

---

## 2026-10-09 — Sesión 1: Análisis de arquitectura + Setup de entorno Foundry

**Alcance acordado con el usuario:** solo preparación del entorno; los módulos se implementan en sesiones siguientes, revisados uno por uno.

### Análisis realizado
- Leídos: `CONTEXTO_MAESTRO.md`, `REGLAS_AGENTES.md`, perfil 02, skills (`monad_parallel_evm_guide`, `solidity_security_and_auditing`, `erc4337_paymaster_session_keys`), `TASK_BACKLOG.md`, `Modelado_SmartContracts.md` v2.0, `SPEC_ORQUESTADOR.md`, `Transferencias_P2P.md`, `Diagrama_Secuencia.md`, `Integracion_Frontend.md`, `Monad_Testnet_Config.md`, `Contract_Addresses.md`.
- **Conclusión:** el spec v2.0 es consistente con el backlog; no se requieren cambios de módulos. Se detectaron gaps de entorno (sin foundry.toml, sin deps, sin Deploy.s.sol en backlog) y 3 puntos de diseño que el spec dejaba abiertos → cerrados y documentados en `TASK_BACKLOG.md` §Decisiones de diseño (v2.1).

### Trabajo ejecutado (Fase 1 — Módulo Entorno)
- `02_SmartContracts_Terminal/foundry.toml` (solc 0.8.28, pragma contratos `^0.8.24`, rpc monad_testnet).
- `.gitignore` local: `out/`, `cache/`, `broadcast/`, `lib/`, `.env*`.
- Dependencias vendored en `lib/` vía `forge install --no-git` con tags fijados: `@openzeppelin-contracts v5.6.1`, `forge-std v1.9.7`. (soldeer inaccesible — ver Error_Index.)
- `remappings.txt` + estructura `src/types/`, `test/`, `script/`.
- `src/types/CurrencyType.sol` (enum compartido ARS/USD) como smoke test.
- Verificación: `forge build` compila limpio; `forge remappings` resuelve OZ y forge-std.
- `TASK_BACKLOG.md` → v2.1: Módulo Entorno completado + decisiones documentadas.

### Estado DoD
| Punto | Estado |
|---|---|
| Build limpio | ✅ `forge build` OK |
| Tests 100% | ⏸️ sin tests aún (Fase 2+) |
| Confirmación <1s en Monad | ⏸️ requiere deploy (sin PRIVATE_KEY fondeada) |
| Gasless/paymaster | ⏸️ verificación end-to-end pertenece a capa ERC-4337/frontend; contratos serán account-agnostic por diseño |
| Logs | ✅ esta entrada |

### Próximo paso sugerido
Módulo 0 (capa de moneda): `MockUSDC.sol`, `MockARS.sol`, `MockExchange.sol` + `MockExchange.t.sol`.

---

## 2026-10-13 — Sesión 2: Módulo 0 — Capa de Moneda ✅

### Trabajo ejecutado
- `src/tokens/MockUSDC.sol` — ERC-20 OZ v5, 6 decimales, `mint` público (documentado demo-only).
- `src/tokens/MockARS.sol` — ERC-20 OZ v5, 18 decimales, `mint` público.
- `src/MockExchange.sol` — `arsPerUsd` escala 1e18, `Ownable` (deployer = owner), `setRate` onlyOwner + `RateUpdated`; swaps con `SafeERC20.transferFrom` origen + `mint` destino al usuario; `ReentrancyGuard`; evento `Converted` indexed (user + currencies); reverts `InvalidRate`/`InvalidAmount`/`ZeroAddress` (incl. dust → output 0).
- `test/MockExchange.t.sol` — **13 tests, 100% pass**: ambos sentidos de swap, math cruzado de decimales (1e6↔1e18), setRate solo owner + evento, reverts de validación, faucet público, decimales.
- Linter forge 1.8: 3 warnings corregidos (eventos reordenados vs writes/calls externos).
- `forge build` limpio sin warnings. Log de tests → `test_logs/2026-10-13_modulo0_forge_test.log`.
- `TASK_BACKLOG.md`: Módulo 0 + Fase 0 marcados completos.

### Estado DoD
| Punto | Estado |
|---|---|
| Build limpio (`forge build`) | ✅ sin errores ni warnings |
| Tests 100% (`forge test`) | ✅ 13/13 — contratos account-agnostic (sin validación de firmas) |
| Confirmación <1s en Monad | ⏸️ pendiente deploy (sin PRIVATE_KEY fondeada) |
| Gasless/paymaster | ⏸️ por diseño (capa ERC-4337/frontend) |
| Logs | ✅ esta entrada + test_logs |

### Próximo paso sugerido
Módulo 1: `TimeStream.sol` (registry de tarifas, voucher EIP-712, escrow de maxCap, killswitch) + `TimeStream.t.sol`.

---

## 2026-10-13 (continuación) — Módulo 1: TimeStream.sol ✅

### Contexto
- Trabajo committeado previamente en rama `feat/02-smart-contracts` (`b5c81c6`): setup + Módulo 0. Se detectó que el workspace ES repo git (`Nachitott/monadflow-demo`).

### Trabajo ejecutado
- `src/TimeStream.sol` — Modo 1 completo según spec v2.0:
  - `MerchantProfile`/`StreamSession`, mappings `sessions`/`merchants`/`merchantSessions`/`userSessions` (aislados por bytes32/address — Parallel EVM).
  - `setRate` self-registration; `startStream` con escrow de `maxCap` + resolución de rate por registry (revert `CurrencyMismatch` — decisión documentada) o voucher EIP-712 `RateVoucher` (EIP712 OZ + ECDSA.recover; stateless por decisión v2.1).
  - `stopStream` nonReentrant: user/merchant/cualquiera-si-cap-agotado (hook keeper del orquestador); CEI + `StreamSettled`.
  - Killswitch `deactivateQR`/`reactivateQR` por address; no afecta sesiones activas.
  - Views: `getSession`, `accruedAmount`, `getUserSessions`, `getMerchantSessions`.
- `test/TimeStream.t.sol` — **25 tests, 100% pass** (38 totales del repo). Voucher firmado on-chain con `vm.sign` + digest EIP-712 replicado en test.
- Errores resueltos: stack-too-deep en destructure de struct público → agregada view `getSession`; `expectEmit` con topic1 desconocido → check parcial (ver Error_Index E5/E6).
- `TASK_BACKLOG.md`: Módulo 1 + Fase 2 marcados completos. Log: `test_logs/2026-10-13_modulo1_forge_test.log`.

### Estado DoD
| Punto | Estado |
|---|---|
| Build limpio | ✅ sin warnings |
| Tests 100% | ✅ 38/38 (25 nuevos) — account-agnostic: solo voucher del comercio valida firma |
| Confirmación <1s en Monad | ⏸️ pendiente deploy |
| Gasless/paymaster | ⏸️ por diseño (capa ERC-4337) |
| Logs | ✅ |

### Próximo paso sugerido
Módulo 2: `MilestoneEscrow.sol` (depósito 100%, etapa 0 intocable, deliver/approve/auto-release, disputa con agent) + `MilestoneEscrow.t.sol`.
