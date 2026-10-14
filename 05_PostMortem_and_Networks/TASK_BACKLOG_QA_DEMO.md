# TASK BACKLOG — QA E2E & Demo (Agente 05)

> Derivado de la **auditoría 2026-10-13**. Checklist maestro de verificación manual E2E + coordinación de despliegue/material de demo. La app debe correrse en **ambos modos**: mock (`NEXT_PUBLIC_CHAIN_MODE=0`) y on-chain (`=1`).
> Bug conocido a verificar primero: env var del flag (`CHAIN_MODE` vs `CHAIN_ENABLED`) — ver `TASK_BACKLOG3.md` F1. **Si el flag no matchea, todo este checklist corre en mock sin que nadie lo note.**
> ✅ Confirmado: `chainMode.ts` lee `NEXT_PUBLIC_CHAIN_MODE === '1'` y `.env.local` usa esa clave.

## 🎯 Estado general
- [x] F0: Verificación de entorno (pre-condición)
- [x] F1: Smoke modo mock (fallback de demo) — **38/38 PASS** (`qa_logs/2026-10-13_smoke_mock.log`)
- [x] F2: Smoke modo on-chain (el diferenciador) — **17/17 PASS** (`qa_logs/2026-10-13_smoke_chain.log`)
- [x] F3: Auditoría de jerga prohibida — 0 violaciones en copy visible
- [x] F4: Coordinación con Agente 02 (verificación explorer)
- [x] F5: Escaleta de video + submission *(grabación del video queda como paso manual)*

---

## 📌 F0 — Pre-condiciones de entorno

- [x] `git status` limpio y `git log origin/main -3` muestra los últimos commits — `origin/main` contiene `2320000` (merge de `feat/onchain-frontend` con el fix del flag). Push verificado.
- [x] `.env.local` existe en `03_Frontend_Terminal/app/` con: `NEXT_PUBLIC_CHAIN_MODE`, las 5 addresses de `Contract_Addresses.md`, `NEXT_PUBLIC_PRIVY_APP_ID`, `GAS_FAUCET_PRIVATE_KEY`. ✅ todas presentes; addresses matchean la tabla.
- [x] `npm run build` verde y `npm run dev` levanta. ✅ build OK (6 páginas + 10 API routes); `vitest` 23/23; dev levanta en :3000 (chain) y :3001 (mock) en paralelo.
- [x] Confirmar que los 5 contratos responden — sin `cast` en esta máquina: verificado vía JSON-RPC `eth_getCode` (bytecode presente en las 5) + `eth_call arsPerUsd()` → `1200e18` (match con params del deploy). RPC ~0.8s.

## 📌 F1 — Smoke modo mock (flag OFF)

Checklist funcional completo — esta es la red de seguridad si testnet falla en la demo:

- [x] Login Privy → dashboard muestra saldos ARS/USD *(gate renderiza 200 + copy limpio; el login OAuth real requiere browser — verificación de código OK, pase visual final pendiente)*
- [x] "Cargar saldo" → modal Mercado Pago → acreditación visible *(verificado API: `POST /api/balances reason=deposit` + entry `deposit` en feed)*
- [x] `/comercio`: editar tarifa, QR visible, killswitch OFF/ON, regenerar QR cierra sesiones activas, reporte diario CSV *(todo PASS; CSV existe en `comercio/page.tsx` → `cierre-*.csv`)*
- [x] `/consumo?m=<qr>`: auto-cap → iniciar → timer en vivo → finalizar → resumen con devolución exacta *(PASS: re-scan devuelve 409 `active_session` = resume, nunca duplica)*
- [x] `/acuerdo`: crear → QR/link → `/acuerdo/[id]` depositar 100% → entregar → aprobar etapa → **cancelar bloqueado antes de pagar etapa 1** (`stage0_locked`) → cancelar habilitado después *(PASS — además `deliver` sin autorización → 403 `stage_not_authorized`; refund exacto 2/3)*
- [x] `/enviar`: por alias y por QR → comprobante #ID → historial *(PASS: `alias_not_found`, `insufficient_funds`, débito/crédito exactos)*
- [x] Feed de actividad unificado muestra todos los eventos *(PASS: `deposit`, `transfer_sent/received`, `consumo`, `escrow_deposit/release/refund`)*

## 📌 F2 — Smoke modo on-chain (flag ON)

Mismo flujo pero verificando contra el explorer — **nunca mostrar addresses/tx en UI**:

- [x] Login → `/api/gas` fondea la wallet silenciosamente — **FIX aplicado:** `TOP_UP` 0.05→0.4 MON (el anterior se agotaba a mitad del flujo: ~0.03 MON/tx a 102 gwei). `MIN_BALANCE` 0.01→0.05. *(ver `qa_logs/chain_smoke.mjs` + `Error_Index.md`)*
- [x] "Cargar saldo" → `mint` real confirmado en explorer (MockARS/MockUSDC) ✅ txs en log
- [x] `/comercio`: `setRate` on-chain → tx en explorer ✅
- [x] `/consumo`: approve + `startStream` → timer → `stopStream` → evento `StreamSettled` con paid/refund exactos ✅ (paid+refund == cap verificado)
- [x] `/acuerdo/[id]`: approve + `createProject` → `deliverStage` → `approveStage` → `cancelProject` → reembolso real ✅ (+**regla clave on-chain**: `cancelProject` revierte pre-etapa-1)
- [x] `/enviar` chain: alias → `transfer` ERC-20 real → comprobante con `txRef` interno ✅
- [x] **Toggle `NEXT_PUBLIC_CHAIN_MODE=0` → mock sigue funcionando** — probado en vivo: :3001 mock (38/38) mientras :3000 corre chain simultáneo sobre el mismo KV.
- [x] Extra: `swapARSforUSDC` 1200 ARS → +1 USD exacto @1200 ✅
- [x] **BUG encontrado y corregido:** `useMonadStream.merchantProfile` leía `merchants()` por nombre pero viem devuelve array posicional → `disabled`/`ratePerSecond` llegaban `undefined` (killswitch on-chain invisible en UI). Normalizado a objeto en `useMonadStream.ts`.

## 📌 F3 — Auditoría Web3 invisible

- [x] Recorrer TODA la app en chain mode: cero `0x…`, "gas", "wallet", "hash", "USDC", "smart contract", nombre de red, "Confirmar en Metamask". *(Auditoría estática exhaustiva sobre `.tsx`: 0 hits en texto JSX, props visibles ni strings de error. HTML servido de las 5 rutas: limpio.)*
- [x] Caminos de error: saldo insuficiente, sesión inexistente, cancelar pre-etapa-1, alias inexistente — todos muestran copy humano. *(Verificado: UI preventiva — botón de cancelar deshabilitado con copy "Cancelación disponible después de liberar la etapa 1"; `friendlyError.ts` mapea todo lo lanzado, `error.message` nunca llega a pantalla.)*
- [x] Registrar cada violación en `Error_Index.md` → **0 violaciones de copy; 2 bugs de plomería encontrados y corregidos** (faucet top-up, decode `merchants`) — registrados en `00_System/Agents_Logs/05_QA_Testing_Demo/Error_Index.md`.

## 📌 F4 — Coordinación con Agente 02

- [x] Los 5 contratos figuran ✅ verificados en `Contract_Addresses.md` (Sourcify/BlockVision `exact_match`, documentado 2026-10-13).
- [x] Logs del smoke `cast` recabados en `test_logs/` — 6 archivos: 77 forge tests PASS + `demo_f3_cast_smoke.log` con txs reales (mint/approve/startStream/stopStream + estados). Mi `chain_smoke.mjs` agrega evidencia E2E con cuentas user/merchant separadas + latencias.

## 📌 F5 — Video demo & submission

- [x] Escaleta cronometrada del video (duración límite de Metropolis): `DEMO_VIDEO_SCRIPT.md` — 8 escenas, 2:45–2:55, con setup previo y checklist de grabación.
- [ ] Ensayo completo x2 con testnet real — **pendiente humano** (necesita login OAuth + cámara). Latencia medida en smoke: ~1.0s/tx → escaleta ya dimensionada para eso. Decisión recomendada: **grabar en chain mode** (el diferenciador) con mock de respaldo.
- [x] `FINAL_SUBMISSION.md` en esta carpeta: link repo, video (pendiente de pegar link), descripción, stack, addresses.
- [x] Repo público verificado: `github.com/Nachitott/monadflow-demo` público, pushed 2026-10-13; `.gitignore` cubre `.env.local`, `.env*`, `.next/`, `node_modules/`; `git ls-files` confirma que solo `.env.example` está trackeado (cero secrets commiteados).

---

## 🔗 Relacionados
- [Frontend Backlog 3](../03_Frontend_Terminal/TASK_BACKLOG3.md)
- [SC Demo Backlog](../02_SmartContracts_Terminal/TASK_BACKLOG_DEMO.md)
- [Pitch Backlog](../01_Architecture/TASK_BACKLOG_PITCH.md)
- [Contract_Addresses](../04_Deploy_and_Networks/Contract_Addresses.md)
- [Checklist Hackathon](../00_System/Skills/hackathon_submission_checklist.md)
- [Escaleta Video](DEMO_VIDEO_SCRIPT.md) · [Submission](FINAL_SUBMISSION.md) · [QA logs](qa_logs/)
