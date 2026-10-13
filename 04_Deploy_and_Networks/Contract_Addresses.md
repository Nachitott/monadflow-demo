# Registro de Direcciones de Contratos (Monad Devnet / Testnet)

Este documento registra las direcciones de los contratos inteligentes desplegados en la red de Monad y sus enlaces al explorador de bloques.

---

## 📋 Tabla de Contratos Desplegados

| Contrato | Dirección en Monad Testnet | Estado | Verificado |
| :--- | :--- | :---: | :---: |
| `MockUSDC.sol` (Op-test) | [`0x27BE5512a477045EF270EE16c804776D6269663C`](https://testnet.monadexplorer.com/address/0x27BE5512a477045EF270EE16c804776D6269663C) | ✅ Deployed | ✅ Sí |
| `MockARS.sol` (Op-test) | [`0x1569b7c9115DF4AFeE1C71689D8E390bceea4958`](https://testnet.monadexplorer.com/address/0x1569b7c9115DF4AFeE1C71689D8E390bceea4958) | ✅ Deployed | ✅ Sí |
| `MockExchange.sol` (ARS↔USD) | [`0x1C87797a412519BbB4AB62e29E24D2530E200026`](https://testnet.monadexplorer.com/address/0x1C87797a412519BbB4AB62e29E24D2530E200026) | ✅ Deployed | ✅ Sí |
| `TimeStream.sol` | [`0xE3209E6b0CC93BCBc05067956ACd1Cf1ec8118C8`](https://testnet.monadexplorer.com/address/0xE3209E6b0CC93BCBc05067956ACd1Cf1ec8118C8) | ✅ Deployed | ✅ Sí |
| `MilestoneEscrow.sol` | [`0xA8f6Fc4a96AD87B4ac4f93cE6F05F9e208d6d817`](https://testnet.monadexplorer.com/address/0xA8f6Fc4a96AD87B4ac4f93cE6F05F9e208d6d817) | ✅ Deployed | ✅ Sí |

> **Verificación (2026-10-13):** los 5 contratos quedaron verificados con `exact_match`
> vía `forge verify-contract --verifier sourcify` sobre el servicio Sourcify de
> BlockVision (`sourcify-api-monad.blockvision.org`), que es el backend de
> MonadVision / MonadExplorer. El código fuente y el ABI quedan legibles en la
> pestaña *Contract* de cada address en el explorer.

---

## 📝 Historial de Deployments
* **Fecha:** 2026-10-13
* **Deployer Wallet:** `0x36b85Da9DdF1f9D67b02830D13506317abe740d1` (owner de `MockExchange`)
* **RPC Used:** `https://testnet-rpc.monad.xyz`
* **Script:** `script/Deploy.s.sol` — artifacts en `broadcast/Deploy.s.sol/10143/run-latest.json`
* **Params:** `arsPerUsd = 1200e18` (1 USD ↔ 1.200 ARS)

> **Estado del frontend:** la app corre en **modo on-chain activo**
> (`NEXT_PUBLIC_CHAIN_MODE=1` + las 5 addresses en `.env.local`).
> Fases F0–F5 + Final de `03_Frontend_Terminal/TASK_BACKLOG2.md` completas —
> smoke on-chain verificado con `cast` (exchange, stream start/stop,
> escrow deliver/approve/cancel, faucet de gas).

---

## 🔗 Archivos Relacionados (Obsidian Graph)
- [Contexto Maestro](../00_System/CONTEXTO_MAESTRO.md)
- [Configuración de Monad Testnet](Monad_Testnet_Config.md)
- [Modelado de Smart Contracts](../01_Architecture/Modelado_SmartContracts.md)
- [Perfil Smart Contracts Engineer](../00_System/Agents/02_Smart_Contracts_Engineer_Agent.md)
- [Backlog Smart Contracts](../02_SmartContracts_Terminal/TASK_BACKLOG.md)
