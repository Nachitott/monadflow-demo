# Diagramas de Secuencia del Sistema (MonadFlow)

Este documento especifica los flujos de interacción del sistema mediante diagramas Mermaid interactivos y sus versiones exportadas individualmente en formato de imagen PNG y SVG para ambos modos de pago, la conversión multimoneda y la pasarela Fiat en MonadFlow.

> **Versión 2.0** — Flujos actualizados al spec v2: escrow de `maxCap` al iniciar stream, tarifa desde registry/voucher del comercio, `deliverStage` como disparador del timer, política de Etapa 0 intocable, disputas con agente y conversión ARS↔USD vía `MockExchange`.

---

## 🟢 1. Diagrama de Secuencia: Modo 1 (Pay-per-use Stream / Check-in QR)

Este flujo describe cómo un cliente escanea un QR en un comercio (gimnasio, coworking, sala de ensayo), congela un límite propio (Auto-Cap) en escrow y consume tiempo con liquidación exacta al cierre — sin costo de gas visible.

### 🖼️ Imagen del Diagrama
![Modo 1: Pay-per-use Stream](images/modo_1_pay_per_use_stream.png)
*Archivos de imagen:* [PNG](images/modo_1_pay_per_use_stream.png) | [SVG](images/modo_1_pay_per_use_stream.svg)
*⚠️ Nota: regenerar imágenes con el flujo v2 (escrow + registry de tarifa).*

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Usuario / Cliente
    participant App as Frontend (Next.js PWA)
    participant Auth as Privy (Passkeys / Social)
    participant Paymaster as ERC-4337 Paymaster
    participant Token as MockUSDC / MockARS (ERC-20)
    participant Contract as TimeStream.sol (Monad)
    participant MerchantDashboard as Merchant Live Dashboard
    actor Comercio as Dueño de Comercio

    Note over Comercio,Contract: Setup previo (una vez): Comercio->>Contract: setRate(ratePerSecond, currency)
    Comercio->>Contract: setRate(tarifa, moneda) — registry on-chain
    Contract-->>MerchantDashboard: Emit RateSet

    Cliente->>App: Escanea QR Estático del Comercio
    App->>Auth: Verifica autenticación social / Passkey
    Auth-->>App: Sesión activa (Embedded Wallet silenciada)
    App->>Token: Verifica saldo suficiente en la moneda elegida (ARS/USD)
    Cliente->>App: Selecciona Auto-Cap (ej: $5.000 ARS) y clica "Iniciar"
    App->>Contract: Exec `startStream(merchant, maxCap, currency, voucher?)`
    Note over App,Contract: Rate resuelto desde registry o voucher EIP-712 del comercio.<br/>Gasless patrocinado por Paymaster (< 1s en Monad)
    Contract->>Token: safeTransferFrom(user → contrato, maxCap) — escrow de sesión
    Contract-->>App: Stream Session Activa #ID
    Contract-->>MerchantDashboard: Emit `StreamStarted` event (Actualiza lista en vivo)

    loop Consumo en Tiempo Real
        App->>App: Incrementa contador visual de tiempo y saldo acumulado
        MerchantDashboard->>MerchantDashboard: Refresca lista activos (1m/5m/15m/Manual)
    end

    alt Cliente finaliza (o Comercio cierra, o cap agotado — cualquiera puede cerrar)
        Cliente->>App: Escanea QR de salida / Clica "Finalizar Sesión"
        App->>Contract: Exec `stopStream(sessionId)`
        Contract->>Contract: totalPaid = min(duración × rate, maxCap) — CEI
        Contract->>Token: Paga totalPaid al comercio + devuelve sobrante al cliente
        Contract-->>MerchantDashboard: Emit `StreamSettled` event
        App-->>Cliente: Pantalla de Pago Exitoso con Resumen en ARS/USD
    end
```

---

## 🔵 2. Diagrama de Secuencia: Modo 2 (Milestone-Lock Escrow / Contratistas)

Este flujo describe cómo un profesional/freelancer crea un acuerdo por partes, el cliente deposita el 100% en custodia congelada upfront, el contratista entrega cada hito on-chain (lo que arranca el timer), y las reglas de Etapa 0 intocable, cancelación y disputa con agente.

### 🖼️ Imagen del Diagrama
![Modo 2: Milestone-Lock Escrow](images/modo_2_milestone_lock_escrow.png)
*Archivos de imagen:* [PNG](images/modo_2_milestone_lock_escrow.png) | [SVG](images/modo_2_milestone_lock_escrow.svg)
*⚠️ Nota: regenerar imágenes con el flujo v2 (deliverStage + etapa 0 + disputa).*

```mermaid
sequenceDiagram
    autonumber
    actor Freelancer as Contratista / Freelancer
    participant App as Frontend (Next.js PWA)
    participant Contract as MilestoneEscrow.sol (Monad)
    participant Agent as Agente / Árbitro (opcional)
    actor Cliente as Cliente / Contratante

    Freelancer->>App: Configura Cobro Fraccionado (Monto, Etapas, Moneda ARS/USD, Timer, agente opcional)
    App-->>Freelancer: Genera Enlace / QR del Proyecto
    Freelancer->>Cliente: Envía enlace de acuerdo por WhatsApp / Email
    Cliente->>App: Abre enlace y revisa desglose por etapas
    Cliente->>App: Clica "Garantizar Fondos (Depósito 100%)"
    App->>Contract: Exec `createProject(contractor, agent?, etapas, moneda, montos[])`
    Note over Contract: safeTransferFrom del 100% congelado en Monad.<br/>Etapa 0 habilitada e INTOCABLE (compromiso sellado)
    Contract-->>App: Proyecto Activo
    Contract-->>Freelancer: Emit ProjectCreated: "Garantía confirmada. Puedes empezar a trabajar."

    Freelancer->>App: Entrega Etapa 0 completada
    App->>Contract: Exec `deliverStage(projectId, 0)` — arranca timer autoRelease
    App->>Cliente: Notificación: "Etapa 0 lista para revisión"

    alt Cliente Aprueba Etapa
        Cliente->>App: Clica "Aprobar Etapa" (1-clic)
        App->>Contract: Exec `approveStage(projectId, 0)`
        Contract->>Freelancer: Libera fracción Etapa 0
        Note over Contract: ✅ Compromiso sellado: a partir de aquí se habilita cancelProject
        Contract-->>App: Desbloquea Etapa 1
    else Timer vence sin respuesta
        Agent->>Contract: `claimAutoRelease(projectId)` — permissionless (keeper/agente)
        Contract->>Freelancer: Libera Etapa 0 automáticamente
    else Disputa (solo si hay agent designado)
        Cliente->>Contract: `disputeStage(projectId, N)` → estado Disputed
        Agent->>Contract: `resolveDispute(projectId, N, contractorShareBps)`
        Contract-->>App: Emit DisputeResolved — reparte fondos según veredicto
    end

    alt Cliente Cancela (solo habilitado tras pago de Etapa 0)
        Cliente->>App: Clica "Cancelar Acuerdo"
        App->>Contract: Exec `cancelProject(projectId)`
        Contract->>Cliente: Reembolsa 100% del saldo de etapas no aprobadas
        Note over Freelancer: Freelancer conserva lo cobrado por etapas previas
    end
```

---

## � 3. Diagrama de Secuencia: Conversión Multimoneda (ARS ↔ USD)

El usuario mantiene dos carteras (Pesos y Dólares) dentro de su cuenta y puede convertir entre ellas en cualquier momento vía `MockExchange`.

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Usuario
    participant App as Frontend (MonadFlow)
    participant Exchange as MockExchange.sol (Monad)
    participant ARS as MockARS (ERC-20)
    participant USD as MockUSDC (ERC-20)

    Usuario->>App: Clica "Convertir" — elige dirección y monto (ej: ARS → USD)
    App->>Exchange: Exec `swapARSforUSDC(amountArs)`
    Exchange->>Exchange: amountOut = amountArs / arsPerUsd (rate admin)
    Exchange->>ARS: safeTransferFrom(user → exchange, amountArs)
    Exchange->>USD: transfiere amountOut al usuario (liquidez del pool)
    Exchange-->>App: Emit `Converted(user, ARS, USD, in, out, rate)`
    App-->>Usuario: Balances duales actualizados al instante
```

---

## �💳 4. Diagrama de Secuencia: Pasarela Fiat (ARS ↔ USDC)

Este flujo describe la conversión transparente entre Pesos Argentinos (Mercado Pago / CVU) y saldo en Monad.

### 🖼️ Imagen del Diagrama
![Pasarela Fiat ARS ↔ USDC](images/pasarela_fiat_ars_usdc.png)
*Archivos de imagen:* [PNG](images/pasarela_fiat_ars_usdc.png) | [SVG](images/pasarela_fiat_ars_usdc.svg)

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Cliente / Comercio
    participant App as Frontend (MonadFlow)
    participant RampAPI as Pasarela On/Off-Ramp Mock
    participant MercadoPago as Mercado Pago / CVU Banco
    participant Monad as Monad Blockchain

    rect rgb(240, 248, 255)
        Note over Usuario,Monad: Flujo On-Ramp (Ingreso de Fondos)
        Usuario->>App: Clica "Cargar Saldo" en Pesos ARS
        App->>Usuario: Muestra CVU / Alias de Transferencia
        Usuario->>MercadoPago: Transfiere $10.000 ARS
        MercadoPago->>RampAPI: Confirma recepción de Pesos ARS
        RampAPI->>Monad: Emite / Acredita crédito equivalente (MockARS o MockUSDC) en Monad
        Monad-->>App: Acredita saldo disponible al instante en la cartera elegida
    end

    rect rgb(255, 240, 245)
        Note over Usuario,Monad: Flujo Off-Ramp (Retiro / Cash-Out a Moneda Local)
        Usuario->>App: Clica "Retirar a Mercado Pago (ARS)"
        App->>Monad: Exec quema / transferencia de crédito
        RampAPI->>MercadoPago: Transfiere Pesos ARS a la cuenta CVU del usuario
        MercadoPago-->>Usuario: Notificación Mercado Pago: "Recibiste Pesos ARS"
    end
```

---

## 🔗 Archivos Relacionados (Obsidian Graph)
- [Contexto Maestro](../00_System/CONTEXTO_MAESTRO.md)
- [Reglas de Agentes](../00_System/REGLAS_AGENTES.md)
- [Modelado de Smart Contracts](Modelado_SmartContracts.md)
- [Transferencias P2P (Modo 3)](Transferencias_P2P.md)
- [Integración Frontend](Integracion_Frontend.md)
- [Spec Agente Orquestador](../06_Agent_Orchestrator/SPEC_ORQUESTADOR.md)
- [Backlog Smart Contracts](../02_SmartContracts_Terminal/TASK_BACKLOG.md)
- [Backlog Frontend](../03_Frontend_Terminal/TASK_BACKLOG.md)
