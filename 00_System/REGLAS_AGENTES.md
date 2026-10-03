# Reglas y Protocolos de Trabajo para Agentes (MonadFlow)

Este documento define el marco de conducta, los estándares de calidad y las restricciones operativas que deben cumplir todos los Agentes de IA que participen en el desarrollo del proyecto **MonadFlow** (Hackathon Monad Metropolis - Track *Consumer Products & Payments*).

---

## 📌 1. Protocolo de Inicio de Sesión
Antes de realizar cualquier modificación en el código o crear un nuevo archivo, todo Agente debe cumplir el siguiente protocolo:
1. Leer obligatoriamente el [Contexto Maestro](CONTEXTO_MAESTRO.md).
2. Leer su perfil asignado dentro de la carpeta [Agents/](Agents/).
3. Consultar el backlog correspondiente ([Smart Contracts Backlog](../02_SmartContracts_Terminal/TASK_BACKLOG.md) o [Frontend Backlog](../03_Frontend_Terminal/TASK_BACKLOG.md)).

---

## 🚫 2. Regla de Oro: Web3 Invisible (Cero Jerga Cripto)
Los agentes que trabajen en la interfaz de usuario (Frontend UX / Fiat Integrations) tienen estrictamente prohibido utilizar o mostrar las siguientes palabras en cualquier pantalla visible para el consumidor final:

| ❌ Término Prohibido | ✅ Reemplazo en Pantalla (Web2-like) |
| :--- | :--- |
| `Wallet / Billetera Cripto` | `Cuenta MonadFlow` / `Mi Perfil` |
| `Gas / Fee / Comisión de red` | *(Inexistente - Transacciones Gasless patrocinadas)* |
| `USDC / Token / Stablecoin` | `Dólares (USD)` / `Pesos (ARS)` |
| `Smart Contract / Escrow` | `Fondo de Garantía Protegido` / `Acuerdo` |
| `Transaction Hash / TxID` | `Comprobante #ID` / `Código de Operación` |

*Referencia de diseño:* [Reglas UX Invisible](Skills/web3_invisible_ux_rules.md).

---

## 🎯 3. Criterios Mínimos de Aceptación (Definition of Done - DoD)
Una tarea o feature solo se considerará **Aprobada / Completada** cuando cumpla con los 5 puntos siguientes:

1. **Build Limpio:** Ejecución sin errores de compilación (`npm run build` en Frontend y `forge build` en Smart Contracts).
2. **Pruebas Unitarias Aprobadas:** Todos los tests pasan al 100% (`forge test` o `npm run test`).
   * **Regla adicional de contratos:** los contratos deben permanecer **account-agnostic** — ningún contrato de negocio valida firmas de usuario (session keys/paymaster viven en la capa ERC-4337). EIP-712 solo para vouchers del comercio.
3. **Verificación Monad Devnet:** La interacción procesa con confirmación en menos de 1 segundo en la RPC de Monad.
4. **Verificación Gasless:** Las transacciones utilizan Paymasters para no cobrar comisión al usuario.
5. **Registro de Logs Obligatorio:** Actualizar las bitácoras en `Agents_Logs/<Nombre_Agente>/`.

---

## 📝 4. Protocolo de Registro de Trabajo y Errores (Logs)
Al finalizar cada sesión o resolver un inconveniente técnico, el agente debe actualizar:
* `Agents_Logs/<Nombre_Agente>/Work_Journal.md`: Breve resumen cronológico del avance logrado.
* `Agents_Logs/<Nombre_Agente>/Error_Index.md`: Si ocurrió un error, documentar el mensaje de fallo, causa raíz diagnosticada y la solución aplicada.

---

## 🔗 Archivos Relacionados (Obsidian Graph)
- [Contexto Maestro](CONTEXTO_MAESTRO.md)
- [Plantillas de Prompts](PROMPTS_TEMPLATES.md)
- [Perfil Product Manager](Agents/01_Product_Manager_Agent.md)
- [Perfil Smart Contracts Engineer](Agents/02_Smart_Contracts_Engineer_Agent.md)
- [Perfil Frontend UX Engineer](Agents/03_Frontend_UX_Engineer_Agent.md)
- [Perfil Fiat Integrations](Agents/04_Fiat_Integrations_Agent.md)
- [Perfil QA Testing & Demo](Agents/05_QA_Testing_Demo_Director_Agent.md)
- [Perfil Agente Orquestador (reserva)](Agents/06_Agent_Orchestrator_Agent.md)
- [Perfil Market Strategy & Pitch](Agents/07_Market_Strategy_Agent.md)
- [Guía Monad EVM](Skills/monad_parallel_evm_guide.md)
- [Guía Web3 Invisible UX](Skills/web3_invisible_ux_rules.md)
- [Guía Fiat ARS Ramps](Skills/fiat_ars_ramps_simulation.md)
- [Guía Hackathon Checklist](Skills/hackathon_submission_checklist.md)
