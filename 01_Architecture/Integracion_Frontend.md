# Arquitectura e Integración Frontend (Next.js / Viem / Wagmi / Privy)

Este documento define la arquitectura de software, árbol de rutas Next.js, abstracción de cuenta Web3 invisible y la gestión de estado para la PWA móvil de MonadFlow.

---

## 🛠️ Stack Tecnológico
* **Framework:** Next.js 14+ (App Router) + TypeScript
* **Estilos & Componentes:** Tailwind CSS + Lucide Icons + Framer Motion
* **Conectividad Web3:** Viem + Wagmi (configurados para Monad Devnet RPC)
* **Nota v2:** money leg 100% ERC-20 — toda escritura que mueva fondos requiere `approve` previo del token (MockUSDC/MockARS) hacia el contrato de negocio, empaquetado en el mismo UserOperation ERC-4337 cuando sea posible.
* **Autenticación Invisible:** Privy SDK (Social Login + Embedded Wallets silenciadas + Passkeys)
* **Account Abstraction (ERC-4337):** Paymasters de Biconomy / ZeroDev para patrocinio de gas y Session Keys

---

## 🗺️ 1. Estructura de Rutas Next.js (`app/`)

```
app/
├── (auth)/
│   └── login/             # Login Social con Google / Passkey (Cero jerga cripto)
├── dashboard/             # Wallet Principal (Saldo Dual ARS/USD + accesos rápidos)
├── scan/                  # Escáner de QR Estático de Comercios (Modo 1)
├── stream/
│   └── [sessionId]/       # Temporizador de Consumo en vivo + Auto-Cap
├── merchant/              # Live Merchant Dashboard (Gimnasios / Coworkings)
│   ├── page.tsx           # Lista en tiempo real de clientes activos
│   └── report/            # Cierre Diario exportable en PDF/Excel
├── milestones/
│   ├── create/            # Creador de acuerdos fraccionados (Modo 2)
│   └── [projectId]/       # Visualizador de Custodia Congelada (Aprobar / Cancelar)
└── layout.tsx             # Root Provider (Privy + Wagmi + CurrencyTicker)
```

---

## 🎨 2. Componentes UI Principales (`components/`)

### `CurrencyHeaderTicker.tsx`
* Muestra el saldo disponible del usuario en tiempo real en la denominación elegida (Pesos ARS y Dólares USD) con un selector rápido de moneda principal.

### `QRStreamTimerWidget.tsx`
* Componente interactivo circular que muestra:
  * Tiempo transcurrido `00:45:12`.
  * Saldo acumulado en pesos/dólares a razón del precio por segundo/minuto.
  * Selector de límite máximo propio (**Auto-Cap**).
  * Botón prominentemente visible: `[ Finalizar Sesión ]`.

### `LiveMerchantTable.tsx`
* Tabla reactiva para el dueño del comercio con:
  * Selector de frecuencia de refresco: `[ 1 min | 5 min | 15 min | Manual 🔄 ]`.
  * Lista de clientes en línea, minutos transcurridos y monto acumulado.
  * Botón de emergencia: `[ 🚫 Desactivar / Matar QR ]` (Killswitch).

### `MilestoneProgressTracker.tsx`
* Visualizador de etapas del proyecto por hitos:
  * Estado de custodia: `🔒 100% Fondos Garantizados en Custodia`.
  * Etapa 1: Completada ✅ ($100.000 ARS).
  * Etapa 2: En revisión ⏳ ($100.000 ARS) -> Botón `[ Aprobar Etapa 1-Clic ]`.
  * Etapa 3: Congelada 🔒 ($100.000 ARS).
  * Botón de seguridad: `[ Cancelar y Reembolsar Etapas Restantes ]`.

---

## 🔌 3. Hooks Personalizados (`hooks/`)

```typescript
// useDualWallet.ts - Balances duales ARS + USD del usuario
export function useDualWallet() {
  const balanceARS: bigint;    // MockARS balanceOf
  const balanceUSD: bigint;    // MockUSDC balanceOf
  const refresh: () => Promise<void>;
  return { balanceARS, balanceUSD, refresh };
}

// useConversion.ts - Conversión ARS ↔ USD vía MockExchange
export function useConversion() {
  const rate: bigint;          // arsPerUsd del MockExchange
  const swapARSforUSD = async (amountARS: bigint) => { ... };
  const swapUSDforARS = async (amountUSD: bigint) => { ... };
  return { rate, swapARSforUSD, swapUSDforARS };
}

// useMonadStream.ts - Gestión de Streaming por tiempo
export function useMonadStream() {
  // El cliente NO elige el rate: lo resuelve el contrato desde el registry del comercio.
  // voucher opcional si el QR porta tarifa promocional firmada por el comercio (EIP-712).
  const startSession = async (merchantAddress: string, autoCap: bigint, currency: 'ARS' | 'USD', voucher?: Hex) => { ... };
  const stopSession = async (sessionId: string) => { ... };
  const setRate = async (ratePerSecond: bigint, currency: 'ARS' | 'USD') => { ... }; // vista comercio
  const toggleQR = async (disabled: boolean) => { ... }; // killswitch
  return { startSession, stopSession, setRate, toggleQR };
}

// useMilestoneEscrow.ts - Gestión de Proyectos por Hitos
export function useMilestoneEscrow() {
  const createProject = async (contractor: string, agent: Address | null, stages: MilestoneInput[], currency: 'ARS' | 'USD') => { ... };
  const deliverStage = async (projectId: string, stageIndex: number) => { ... };   // contratista marca entrega → arranca timer
  const approveStage = async (projectId: string, stageIndex: number) => { ... };
  const cancelProject = async (projectId: string) => { ... };                      // solo habilitado tras pago Etapa 0
  const disputeStage = async (projectId: string, stageIndex: number) => { ... };   // requiere agent != address(0)
  return { createProject, deliverStage, approveStage, cancelProject, disputeStage };
}

// useFiatRamp.ts - Widget Simulado Mercado Pago / CVU
export function useFiatRamp() {
  const depositARS = async (amountARS: number) => { ... };                         // acredita MockARS (o MockUSDC según elección)
  const withdrawARS = async (amountUSD: number, cvu: string) => { ... };
  return { depositARS, withdrawARS };
}
```

---

## 🛡️ 4. Reglas de UX Invisible Aplicadas en Código

Para cumplir con la norma de **Cadena de Bloques Invisible** exigida por Metropolis:
1. **Manejo Silencioso de Errores:** Si una transacción en Devnet falla, la UI muestra `"No se pudo procesar la solicitud, intenta nuevamente"`, nunca un error RPC ni revert hash.
2. **Patrocinio de Gas (Paymaster):** Todas las llamadas Web3 se envían envueltas a través del Paymaster ERC-4337. La UI no incluye selector de Gas Price ni confirma pop-ups de Metamask.
3. **PWA Mobile-First:** Diseñado como aplicación web progresiva optimizada para ser agregada a la pantalla de inicio en smartphones Android e iOS.

---

## 🔗 Archivos Relacionados (Obsidian Graph)
- [Contexto Maestro](../00_System/CONTEXTO_MAESTRO.md)
- [Reglas de Agentes](../00_System/REGLAS_AGENTES.md)
- [Diagrama de Secuencia](Diagrama_Secuencia.md)
- [Modelado de Smart Contracts](Modelado_SmartContracts.md)
- [Spec Agente Orquestador](../06_Agent_Orchestrator/SPEC_ORQUESTADOR.md)
- [Perfil Frontend UX Engineer](../00_System/Agents/03_Frontend_UX_Engineer_Agent.md)
- [Perfil Fiat Integrations](../00_System/Agents/04_Fiat_Integrations_Agent.md)
- [Backlog Frontend](../03_Frontend_Terminal/TASK_BACKLOG.md)
- [Guía Web3 Invisible UX](../00_System/Skills/web3_invisible_ux_rules.md)
