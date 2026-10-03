# Spec: Agente Orquestador de Decisiones (Capa Futura)

Este documento define el **contrato de interfaz** del futuro agente intermediario de MonadFlow: qué observa, qué puede ejecutar, con qué identidad firma y bajo qué límites. **No forma parte del MVP de hackathon** — los contratos ya quedaron diseñados para que se integre sin redespliegues.

> **Estado:** 📐 Especificación reservada. Sin implementación en el MVP.

---

## 🎯 1. Rol del Agente (Modelo Híbrido)

El orquestador puede operar en **dos modos complementarios**, ya soportados por el diseño de contratos:

### A. Delegado del Usuario (sin cambios en contratos)
- Actúa **en nombre del usuario** mediante **Session Keys ERC-4337** con permisos acotados, delegadas por la Smart Account del usuario.
- `msg.sender` sigue siendo la cuenta del usuario — el contrato no distingue quién firmó.
- Casos de uso: auto-aprobar una etapa si se cumplieron condiciones verificables off-chain, cerrar un stream olvidado, ejecutar la voluntad preconfigurada del usuario.

### B. Árbitro / Mediador (rol explícito por proyecto)
- El cliente designa `agent` (la address del orquestador) al crear el proyecto en `MilestoneEscrow.createProject`. Puede ser `address(0)`.
- Si existe, `client` o `contractor` pueden escalar una etapa a `Disputed` y el agente la resuelve con `resolveDispute(projectId, stageIndex, contractorShareBps)`.
- Casos de uso: mediación de disputas freelance, veredictos basados en evidencia entregada (commits, archivos, deadlines).

---

## 👁️ 2. Eventos Consumidos (Listener)

El agente se suscribe a estos eventos (todos con `indexed` en actor + id para filtros RPC eficientes):

| Contrato | Evento | Reacción esperada del agente |
|---|---|---|
| `TimeStream` | `StreamStarted` | Trackear sesión activa; calcular cuándo `elapsed*rate >= maxCap` |
| `TimeStream` | `StreamSettled` | Cerrar tracking; actualizar métricas |
| `TimeStream` | `RateSet` / `MerchantDeactivated` | Actualizar caché de comercios |
| `MilestoneEscrow` | `ProjectCreated` | Registrar si el proyecto lo designó como `agent` |
| `MilestoneEscrow` | `StageDelivered` | Iniciar cuenta regresiva de `autoReleaseSeconds` |
| `MilestoneEscrow` | `StageApproved` / `AutoReleased` | Avanzar etapa en el modelo de estado off-chain |
| `MilestoneEscrow` | `ProjectDisputed` | **Disparar flujo de arbitraje** (recolectar evidencia, decidir) |
| `MilestoneEscrow` | `ProjectCancelled` / `ProjectCompleted` | Archivar proyecto |
| `MockExchange` | `Converted` | (Opcional) métricas de conversión |

---

## ⚡ 3. Funciones Autorizadas (Executor)

| Función | Contrato | Modo | Precondición |
|---|---|---|---|
| `stopStream(sessionId)` | TimeStream | Keeper | `elapsed*rate >= maxCap` (permissionless) |
| `claimAutoRelease(projectId)` | MilestoneEscrow | Keeper | `deliveredAt + autoReleaseSeconds <= now` (permissionless) |
| `resolveDispute(projectId, stageIndex, shareBps)` | MilestoneEscrow | Árbitro | `msg.sender == project.agent`, proyecto `Disputed` |
| `approveStage(...)` / `stopStream(...)` | Ambos | Delegado | Session Key válida del usuario (scope ERC-4337) |

**Nunca** puede: mover fondos fuera de las reglas del contrato, cancelar proyectos, cambiar tarifas, ni actuar en proyectos donde `agent == address(0)`.

---

## 🔑 4. Modelo de Signer e Identidad

- **Como árbitro:** opera con una **Smart Account propia** (o EOA dedicada) cuya address se pasa como `agent` en `createProject`. Recomendado: Smart Account para recibir patrocinio de gas.
- **Como delegado:** no tiene identidad propia en el contrato — usa la Session Key delegada por el usuario (permisos definidos en el validator de la cuenta: funciones permitidas + límites de gasto + expiración).
- **Scopes mínimos recomendados de Session Key:** `{ TimeStream.stopStream, MilestoneEscrow.approveStage, maxSpendPerTx, expiry }`.

---

## 🧱 5. Arquitectura del Servicio (cuando se implemente)

```
06_Agent_Orchestrator/
├── listener/      # suscripción a eventos (viem watchEvent / indexer)
├── engine/        # reglas de decisión (timeouts, veredictos, evidencia)
├── signer/        # Smart Account del agente + manejo de Session Keys
└── state/         # modelo de estado off-chain replicado desde eventos
```

- Consume los **mismos ABIs** exportados a `02_SmartContracts_Terminal/ABIs/`.
- No requiere backend custodio de fondos: toda ejecución pasa por las reglas de los contratos.

---

## 🚫 6. Fuera de Alcance (MVP)

- Motor de decisión con IA / verificación de evidencia off-chain.
- Disputas en proyectos sin `agent` designado.
- Custodia de fondos del agente (el agente nunca recibe dinero, solo firma decisiones).
- Slashing / reputación del árbitro (diseño futuro post-hackathon).

---

## 🔗 Archivos Relacionados (Obsidian Graph)
- [Contexto Maestro](../00_System/CONTEXTO_MAESTRO.md)
- [Modelado de Smart Contracts](../01_Architecture/Modelado_SmartContracts.md)
- [Diagrama de Secuencia](../01_Architecture/Diagrama_Secuencia.md)
- [Perfil Agente Orquestador](../00_System/Agents/06_Agent_Orchestrator_Agent.md)
- [Skill ERC-4337 Session Keys](../00_System/Skills/erc4337_paymaster_session_keys.md)
- [Work Journal](../00_System/Agents_Logs/06_Agent_Orchestrator/Work_Journal.md)
