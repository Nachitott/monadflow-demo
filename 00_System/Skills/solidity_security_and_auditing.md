# Skill: Solidity Security & EVM Best Practices

## Checkpoints de Seguridad
- **Checks-Effects-Interactions (CEI):** Actualizar el estado interno de las sesiones o proyectos ANTES de realizar cualquier transferencia de ETH/Tokens.
- **Protección Reentrancy:** Usar `ReentrancyGuard` de OpenZeppelin en funciones que liberen saldo (`stopStream`, `approveStage`, `cancelProject`, `claimAutoRelease`).
- **Manejo Estricto de Unidades:**
  - Validar que $ratePerSecond \times duration$ no genere desbordamientos (*overflows*).
  - Usar `uint256` para timestamps y montos de precisión en WEI.
- **Control de Acceso (AccessControl / Ownable):** Restringir `deactivateQR`/`reactivateQR` estrictamente al comercio (killswitch por `address`), `setRate` al merchant, `resolveDispute` al `agent` del proyecto y `setRate` del MockExchange al owner.
- **Manejo de Reembolsos Reversibles:** Si una transferencia de devolución falla, usar el patrón *Pull over Push* o revertir explícitamente para evitar congelar el contrato.

## Archivos Relacionados
- [[Modelado_SmartContracts]]
- [[02_Smart_Contracts_Engineer_Agent]]