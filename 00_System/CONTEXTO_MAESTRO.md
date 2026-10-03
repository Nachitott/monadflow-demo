# CONTEXTO MAESTRO DEL PROYECTO: MonadFlow
**Hackathon:** Monad Metropolis Global  
**Track:** Consumer Products & Payments  
**Objetivo:** Plataforma de streaming de pagos en tiempo real y custodia fraccionada por hitos con experiencia 100% Web2 (cadena de bloques invisible) conectada con moneda local (Pesos ARS / CVU).

---

## 🎯 1. Filosofía y Criterios de Diseño (Web3 Invisible)
* **Cero terminología cripto:** Sin palabras como "gas", "wallet", "hash", "USDC", "smart contract".
* **Autenticación Invisible:** Login Social (Google / Apple ID / Passkeys) vía Privy / Web3Auth.
* **Transacciones Gasless:** Transacciones patrocinadas mediante ERC-4337 Account Abstraction (Paymasters) y Claves de Sesión (Session Keys) para firmas silenciosas.
* **Integración Fiat (ARS ↔ USDC):** Operaciones nativas en dólares digitales para protección inflacionaria, con interfaz adaptada a Pesos Argentinos (ARS) y retiro/ingreso instantáneo vía Mercado Pago / CVU.
* **Wallets Duales ARS + USD:** El usuario mantiene **dos carteras separadas dentro de una sola cuenta** — puede ingresar fondos un día en Pesos y otro día en Dólares, decidir en qué moneda conservar sus activos, y **convertir entre ARS ↔ USD** dentro de la app (vía `MockExchange` on-chain con tipo de cambio administrado). Los acuerdos se fijan en la moneda elegida (ARS o USD) y se congelan en esa denominación.

---

## 🟢 2. MODO 1: Cobro por Consumo / Tiempo (Pay-per-use Stream)
* **Destinado a:** Gimnasios, coworkings, salas de ensayo, estacionamientos, servicios por consumo de tiempo o APIs/SaaS.
* **QR Único Estático:** El comercio utiliza un único código QR impreso o mostrado en pantalla.
* **Requisito de Saldo Previo:** El cliente debe contar con saldo suficiente cargado previamente en su cuenta para iniciar el check-in.
* **Límite Autoconfigurable (Auto-Cap):** El cliente puede establecer un tope máximo de gasto para la sesión (ej. "máximo $5.000 ARS").
* **Panel de Control en Vivo (Live Merchant Dashboard):**
  * Lista en tiempo real de clientes activos, minutos transcurridos y monto acumulado.
  * Frecuencia de actualización configurable (1 min, 5 min, 15 min o Manual 🔄).
* **Cierre Diario:** Generación exportable de reporte al final de la jornada (recaudación total, clientes atendidos y desglose).
* **Boton de Apagado (Killswitch):** Desactivación inmediata del QR en caso de mantenimiento, error o cambio de tarifa.

---

## 🔵 3. MODO 2: Cobro Garantizado por Etapas (Milestone-Lock Escrow)
* **Destinado a:** Freelancers, desarrolladores, diseñadores, contratistas de obras, consultores y servicios profesionales por encargo.
* **Depósito Total Congelado (100% Upfront):** Para iniciar el trabajo, el contratante deposita el 100% del monto acordado en el contrato inteligente. El trabajador verifica la garantía total antes de comenzar.
* **División en Hitos/Etapas:** El monto se subdivide en etapas (ej. 3 partes iguales o porcentajes personalizados).
* **Primera Etapa Intocable (Compromiso Sellado):** Una vez depositado el 100%, la **Etapa 0 queda congelada para liberación del cliente sin posibilidad de retroceder**. El proyecto **no puede cancelarse ni disputarse hasta que esa primera fracción haya sido pagada** al trabajador — así se garantiza que ninguna persona trabaje sin cobertura mínima asegurada. Recién después del primer pago se habilita la cancelación del acuerdo.
* **Desbloqueo en 1-Clic:** Al entregar cada etapa, el cliente revisa y aprueba con un solo clic, liberando la fracción de dinero al trabajador y activando la siguiente etapa.
* **Auto-Aprobación por Temporizador (Opcional):** Plazo configurable (ej. 5 días). Si el cliente no responde tras la entrega del hito (`deliverStage` on-chain), los fondos se liberan automáticamente.
* **Resolución de Disputas (Agente Opcional):** Cada proyecto puede designar una **dirección de agente/árbitro** (`agent`, puede ser `address(0)`). Si existe, client o contratista pueden escalar una etapa entregada a `Disputed` y el agente la resuelve repartiendo los fondos. Diseñado para la futura integración del [Agente Orquestador](../06_Agent_Orchestrator/SPEC_ORQUESTADOR.md).
* **Política de Cancelación y Reembolso:**
  * Habilitada **solo después del pago de la Etapa 0**.
  * Si el contratante decide cancelar el proyecto antes de completar las etapas restantes, se le devuelve el **100% de los fondos aún congelados** de las etapas no aprobadas.
  * El trabajador conserva únicamente los fondos correspondientes a las etapas previamente aprobadas y liquidadas.
* **Boton de Apagado (Killswitch):** Desactivación inmediata del enlace/QR de pago fraccionado en caso de cancelación del trato previa al depósito.

---

## ⚡ 4. Arquitectura Técnica y Justificación de Monad
* **Por qué Monad es indispensable:**
  * **10,000 TPS y 1s Block Finality:** Permite streaming de micropagos segundo a segundo sin saturación ni latencia.
  * **Parallel EVM:** Manejo de miles de check-ins y check-outs concurrentes en múltiples comercios sin cuellos de botella de estado.
  * **Smart Contracts de Custodia:** Inviolabilidad y automatización infalsificable del Escrow sin comisiones bancarias del 2-5%.
* **Stack Tecnológico:**
  * **Smart Contracts:** Solidity — capa de moneda `MockUSDC.sol` / `MockARS.sol` / `MockExchange.sol` (conversión ARS↔USD) + contratos de negocio `TimeStream.sol` (Modo 1) y `MilestoneEscrow.sol` (Modo 2). Money leg 100% ERC-20.
  * **Frontend:** Next.js / React (PWA móvil responsiva) + Tailwind CSS + Lucide Icons.
  * **Web3 Core:** Viem / Wagmi + Privy (Social Login & Embedded Wallets).
  * **Account Abstraction:** ERC-4337 (Paymaster patrocinador de gas + Session Keys). Contratos account-agnostic — las firmas de usuario se validan en la capa de cuenta.
  * **Fiat Integration Mock:** Widget interactivo de simulación Mercado Pago / CVU ↔ USDC.
  * **Agente Orquestador (futuro):** Servicio intermediario de decisiones — listener de eventos + motor de decisión + signer. Dos modos de acción ya previstos en los contratos: **delegado del usuario** vía Session Keys con permisos acotados, y **árbitro** vía el rol `agent` por proyecto (`Disputed`/`resolveDispute`). Spec en [06_Agent_Orchestrator](../06_Agent_Orchestrator/SPEC_ORQUESTADOR.md).

---
## ðŸ”— Mapa de Relaciones (Obsidian Graph)
- **Agentes:**
  - [Product Manager (OpenCode)](Agents/01_Product_Manager_Agent.md)
  - [Smart Contracts Engineer (Devin Pro)](Agents/02_Smart_Contracts_Engineer_Agent.md)
  - [Frontend UX Engineer (Devin Pro)](Agents/03_Frontend_UX_Engineer_Agent.md)
  - [Fiat Integrations (OpenCode)](Agents/04_Fiat_Integrations_Agent.md)
  - [QA Testing & Demo (OpenCode)](Agents/05_QA_Testing_Demo_Director_Agent.md)
  - [Agente Orquestador (reserva futura)](Agents/06_Agent_Orchestrator_Agent.md)
- **Skills:**
  - [Monad Parallel EVM Guide](Skills/monad_parallel_evm_guide.md)
  - [Web3 Invisible UX Rules](Skills/web3_invisible_ux_rules.md)
  - [Fiat ARS Ramps Simulation](Skills/fiat_ars_ramps_simulation.md)
  - [Hackathon Submission Checklist](Skills/hackathon_submission_checklist.md)
- **Backlogs:**
  - [Smart Contracts Backlog](../02_SmartContracts_Terminal/TASK_BACKLOG.md)
  - [Frontend Backlog](../03_Frontend_Terminal/TASK_BACKLOG.md)
- **Arquitectura futura:**
  - [Spec Agente Orquestador](../06_Agent_Orchestrator/SPEC_ORQUESTADOR.md)
/