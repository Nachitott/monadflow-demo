# Checklist de Seguridad — MonadFlow (para pitch / jurado)

> Artefacto F3 del `TASK_BACKLOG_DEMO.md`. Resumen verbal de las garantías
> implementadas y verificadas en los 77 tests de Foundry (100% pass — ver
> `test_logs/2026-10-13_demo_f0_forge_test.log`).

## Patrones aplicados

| Patrón | Dónde | Garantía |
| :--- | :--- | :--- |
| **CEI (Checks-Effects-Interactions)** | `stopStream`, `approveStage`, `cancelProject`, `resolveDispute`, `claimAutoRelease`, swaps | Estado actualizado antes de cualquier transfer externa |
| **ReentrancyGuard (OZ v5)** | Todas las funciones que mueven fondos | Payouts no re-entrables |
| **Escrow por sesión** | `TimeStream.startStream` | `maxCap` retenido al iniciar → el comercio siempre cobra, el usuario nunca paga de más que su tope |
| **Etapa 0 intocable** | `MilestoneEscrow.cancelProject` → `StageZeroLocked` | El proyecto no puede cancelarse ni disputarse hasta pagar la primera fracción al trabajador |
| **SafeERC20** | Todas las transferencias ERC-20 | Manejo seguro de tokens que no devuelven bool |
| **Account-agnostic** | Los 3 contratos de negocio | Ningún contrato valida firmas de usuario — session keys/paymaster viven en la capa ERC-4337 |
| **EIP-712 solo para voucher del comercio** | `TimeStream` `RateVoucher` | Tarifa firmada off-chain por el comercio; el cliente nunca elige el precio |
| **Parallel EVM friendly** | Mappings aislados por `bytes32`/`address` | Sin acumuladores globales ni contadores compartidos — sesiones y comercios no compiten por el mismo slot |

## Matriz de control de acceso

Documentada completa en `01_Architecture/Modelado_SmartContracts.md` §3. Resumen:

- `setRate` / `deactivateQR` / `reactivateQR`: solo el comercio (`msg.sender`, self-registration)
- `stopStream`: usuario o comercio de la sesión; **cualquiera** si el cap se agotó (fondos nunca quedan atrapados)
- `deliverStage`: solo contractor · `approveStage`/`cancelProject`: solo client
- `resolveDispute`: solo `project.agent` · `claimAutoRelease`: permissionless (keepers)
- `MockExchange.setRate`: solo `owner` (Ownable)

## Limitaciones aceptadas (documentadas, hackathon)

- `mint` público en MockUSDC/MockARS — faucet demo, nunca producción
- `MockExchange` con rate admin-fijo y liquidez simulada (pool infinito)
- `RateVoucher` sin replay-guard hasta `expiresAt` (habilita tarifas promo; decisión v2.1)
- `sessionId`/`projectId` derivan de `nonce + timestamp` (unicidad, no RNG de seguridad)

## Evidencia on-chain

- Deploy real en Monad Testnet (chain 10143): `broadcast/Deploy.s.sol/10143/run-latest.json`
- Smoke en vivo (mint → approve → startStream → accrual → stopStream):
  `test_logs/2026-10-13_demo_f3_cast_smoke.log`
- Código verificado `exact_match` en MonadExplorer/MonadVision (vía Sourcify)
