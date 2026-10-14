# FINAL SUBMISSION — MonadFlow

**Hackathon:** Monad Metropolis Global
**Track:** Consumer Products & Payments
**Fecha:** 2026-10-13

---

## 🔗 Entregables

| Entregable | Link / Estado |
| :--- | :--- |
| **Repo GitHub (público)** | https://github.com/Nachitott/monadflow-demo ✅ público, README + docs Obsidian |
| **Producto desplegado** | Monad Testnet (chain 10143) — 5 contratos verificados `exact_match` vía Sourcify/BlockVision ✅ |
| **Video demo (≤3 min)** | ⏳ pendiente — escaleta cronometrada en `DEMO_VIDEO_SCRIPT.md` |
| **QA E2E** | 38/38 checks mock + 17/17 checks on-chain — logs en `qa_logs/` ✅ |

## 📦 Descripción

MonadFlow es una plataforma de pagos en tiempo real con **experiencia 100% Web2 sobre Monad**:

- **Modo 1 — Pago por uso:** el comercio muestra un QR; el cliente fija un tope máximo de gasto y paga *por segundo* de consumo, con devolución exacta de lo no usado. Panel de comercio en vivo, killswitch y cierre diario exportable (CSV).
- **Modo 2 — Acuerdo protegido por etapas:** el cliente deposita el **100% upfront** en un fondo de garantía; el dinero se libera etapa por etapa con aprobación en 1 clic. La primera etapa queda *sellada*: el proyecto no puede cancelarse ni disputarse hasta que el trabajador cobra esa fracción. Cancelación posterior = reembolso del 100% restante.
- **Modo 3 — Envíos P2P:** transferencias instantáneas por alias/QR con "Comprobante #ID".

Todo en **ARS o USD** (conversión on-chain vía `MockExchange` @1200), login con Google (Privy, cuentas embebidas), gas patrocinado y **cero jerga cripto en pantalla**.

## ⚡ Por qué Monad

- **10.000 TPS + finalidad ~1s** → cobro por segundo sin saturación; medido en smoke: ~1.0s promedio de confirmación por tx.
- **Parallel EVM** → miles de sesiones de streaming concurrentes sin cuello de estado.
- **Escrow programable** → custodia infalsificable sin comisiones bancarias.

## 🧱 Stack

Next.js 14 (App Router) · Tailwind · Privy (social login + embedded wallets) · wagmi/viem · Solidity (Foundry) · KV store para estado demo · Doble modo: **on-chain real** (`NEXT_PUBLIC_CHAIN_MODE=1`) y **fallback mock** para demo offline.

## 📝 Contratos (Monad Testnet — verificados)

| Contrato | Address | Explorer |
| :--- | :--- | :--- |
| `MockUSDC` | `0x27BE5512a477045EF270EE16c804776D6269663C` | [ver](https://testnet.monadexplorer.com/address/0x27BE5512a477045EF270EE16c804776D6269663C) |
| `MockARS` | `0x1569b7c9115DF4AFeE1C71689D8E390bceea4958` | [ver](https://testnet.monadexplorer.com/address/0x1569b7c9115DF4AFeE1C71689D8E390bceea4958) |
| `MockExchange` | `0x1C87797a412519BbB4AB62e29E24D2530E200026` | [ver](https://testnet.monadexplorer.com/address/0x1C87797a412519BbB4AB62e29E24D2530E200026) |
| `TimeStream` | `0xE3209E6b0CC93BCBc05067956ACd1Cf1ec8118C8` | [ver](https://testnet.monadexplorer.com/address/0xE3209E6b0CC93BCBc05067956ACd1Cf1ec8118C8) |
| `MilestoneEscrow` | `0xA8f6Fc4a96AD87B4ac4f93cE6F05F9e208d6d817` | [ver](https://testnet.monadexplorer.com/address/0xA8f6Fc4a96AD87B4ac4f93cE6F05F9e208d6d817) |

## 🧪 Evidencia de QA (2026-10-13)

- `qa_logs/2026-10-13_smoke_mock.log` — 38/38 PASS (API layer, modo mock)
- `qa_logs/2026-10-13_smoke_chain.log` — 17/17 PASS (txs reales en testnet)
- `02_SmartContracts_Terminal/test_logs/` — 77 forge tests + smoke `cast` del Agente 02
- Scripts reproducibles: `qa_logs/smoke_e2e.mjs`, `qa_logs/chain_smoke.mjs`

## ⚠️ Pendiente manual (humano)

- Grabar el video con la escaleta y subir el link aquí.
- Login Privy real (OAuth) y `QRScanner` con cámara en dispositivo físico — verificados por código, falta el pase visual final.
