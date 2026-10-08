# Spec: Modo 3 — Transferencias P2P (Peer-to-Peer)

Este documento define la especificación del tercer modo de MonadFlow: envío directo de dinero entre usuarios ("de toda la vida"). Diseñado con **backend intercambiable**: en la demo corre sobre la capa mock existente (misma coherencia de balances que los demás modos); post-MVP se migra solo la ejecución a los tokens ERC-20 sin tocar la UI.

> **Estado:** 📐 Especificado — pendiente de implementación (Fase 5 del backlog frontend).

---

## 🎯 1. Concepto de Producto

* **Qué hace:** enviar Pesos o Dólares a otra persona usando un **alias/CVU** o un **QR personal**, con comprobante inmediato.
* **Regla de oro intacta:** nunca se muestra `0x...`, ni jerga cripto. El destinatario es un nombre/alias (`nacho.mp`, `juan.cvu`), el resultado es un "Comprobante #ID".
* **Cartera:** el usuario elige desde cuál de sus dos carteras (ARS o USD) sale el dinero.
* **No es custodia ni acuerdo:** el dinero se transfiere instantáneamente, sin etapas ni revisión. Es el modo más simple de los tres.

---

## 🏗️ 2. Arquitectura (Backend Intercambiable)

```
UI "Enviar dinero" (/enviar)
   └─> useTransfers()            ← ÚNICO punto de recambio (seam)
        ├─> DEMO (ahora): POST /api/transfers → mf:transfers en store.ts
        └─> POST-MVP:      MockUSDC.transfer / TransferHub.sendTo (gasless)

UI "Mi QR" (recibir)
   └─> QR con ?to=<alias> → resolución via /api/aliases (alias → destinatario)
```

**Principio de diseño:** la capa de servicio (`useTransfers` + `/api`) queda encapsulada detrás de firmas que ya tienen la forma del contrato futuro. Migrar = cambiar el cuerpo del hook, no las pantallas.

---

## 📦 3. Modelo de Datos

### `TransferRecord` (shape alineado al futuro evento `Sent` on-chain)

```typescript
interface TransferRecord {
  id: string;              // 'tr-...' en demo; tx hash en post-MVP
  from: string;            // userId/alias del emisor
  to: string;              // alias destinatario
  toUserId?: string;       // resuelto via registry
  amount: number;
  currency: 'ARS' | 'USD';
  note?: string;           // "Por la pizza 🍕" — se mapea al campo `ref`/memo on-chain
  txRef?: string;          // null en demo; comprobante on-chain post-MVP
  status: 'completed' | 'pending' | 'failed';
  createdAt: number;
}
```

### `AliasRegistry` (registry de destinatarios)

```typescript
interface AliasRecord {
  alias: string;           // 'nacho.mp', 'juan.cvu' — único, case-insensitive
  userId: string;          // cuenta Privy
  // Post-MVP: mapping(bytes32 aliasHash => address wallet) on-chain
}
```

### Store (extensión de `lib/server/store.ts`)

```typescript
const K_TRANSFERS = 'mf:transfers';
const K_ALIASES   = 'mf:aliases';
// + funciones: listTransfers(userId), getTransfer(id), saveTransfer(t),
//              getAlias(alias), saveAlias(a)
// + débito/crédito de balances en BalanceContext vía la API (misma mecánica que hoy)
```

---

## 🔌 4. API (Demo)

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/aliases` | GET/POST | Resolver `?alias=` → destinatario; registrar alias propio |
| `/api/transfers` | GET/POST | Historial del usuario; crear transferencia |
| `/api/transfers/[id]` | GET | Detalle/comprobante |

**Validaciones server-side:** saldo suficiente en la cartera elegida, destinatario existente, monto > 0, débito+crédito atómico, `status: 'completed'` inmediato.

---

## 🧩 5. UI / Flujo

* **Ruta:** `/enviar` (nueva) + acceso desde dashboard (`BalanceCard` → "Enviar").
* **Paso 1 — A quién:** input de alias/CVU con resolución en vivo (muestra nombre al encontrarlo) **o** botón escanear QR (reutiliza `QRScanner`/`html5-qrcode`; el QR personal lleva `?to=<alias>`).
* **Paso 2 — Cuánto:** monto en formato es-AR + selector de cartera `ARS | USD` + nota opcional.
* **Paso 3 — Confirmar y enviar:** 1-clic → pantalla de éxito con **Comprobante #ID** (el `id` del registro; jamás un hash).
* **Mi QR:** en el perfil, cada usuario muestra su QR de cobro (`qrcode.react`, ya instalado).
* **Historial:** lista de enviados/recibidos dentro de `/enviar` o en dashboard.

### Componentes nuevos sugeridos (`components/p2p/`)
* `SendMoneyForm.tsx` — alias + monto + cartera + nota.
* `MyReceiveQR.tsx` — QR personal de cobro.
* `TransferReceipt.tsx` — comprobante post-envío.
* `TransferHistoryList.tsx` — historial.

### Hook único (`src/lib/useTransfers.ts` o `hooks/`)

```typescript
export function useTransfers() {
  const send = async (to: string, amount: number, currency: 'ARS' | 'USD', note?: string) => { ... };
  const resolveAlias = async (alias: string) => { ... };
  const history: TransferRecord[];
  return { send, resolveAlias, history };
}
```

---

## 🔀 6. Camino de Migración Post-MVP

| Pieza | Demo (ahora) | Post-MVP | Esfuerzo |
|---|---|---|---|
| Ejecución | `POST /api/transfers` | `MockUSDC/MockARS.transfer(to, amount)` vía Smart Account gasless | Cambiar cuerpo de `send()` |
| Registry | `mf:aliases` en KV | `mapping(bytes32 => address)` on-chain o híbrido | Swap de `resolveAlias` |
| Comprobante | `tr-...` id | `txRef` = tx hash real (mostrado como "Comprobante #ID") | Campo ya existe |
| Historial | `GET /api/transfers` | Indexer de eventos `Transfer`/`Sent` | Nueva fuente de datos |
| (Opcional) `TransferHub.sol` | — | wrapper que emite `Sent(from,to,currency,amount,ref)` → historial indexable + hook de observabilidad para el [Agente Orquestador](../06_Agent_Orchestrator/SPEC_ORQUESTADOR.md) | Contrato chico, aditivo |

**Regla de coherencia (importante):** mientras streams y acuerdos sigan mock, P2P también es mock — nunca mezclar dinero real y simulado en la misma demo. La migración se hace toda junta en Fase 6.

---

## 🤖 7. Hook para el Agente Orquestador (futuro)

Si post-MVP se implementa `TransferHub.sol`, el evento `Sent(indexed from, indexed to, currency, amount, ref)` queda disponible para que el orquestador observe transferencias (límites, scoring, detección) — mismo patrón de listeners ya definido en `SPEC_ORQUESTADOR.md`. No requiere acción ahora; basta con que el modelo `TransferRecord` mantenga `txRef`.

---

## 🔗 Archivos Relacionados (Obsidian Graph)
- [Contexto Maestro](../00_System/CONTEXTO_MAESTRO.md)
- [Modelado de Smart Contracts](Modelado_SmartContracts.md)
- [Integración Frontend](Integracion_Frontend.md)
- [Diagrama de Secuencia](Diagrama_Secuencia.md)
- [Spec Agente Orquestador](../06_Agent_Orchestrator/SPEC_ORQUESTADOR.md)
- [Backlog Frontend](../03_Frontend_Terminal/TASK_BACKLOG.md)
- [Perfil Frontend UX Engineer](../00_System/Agents/03_Frontend_UX_Engineer_Agent.md)
