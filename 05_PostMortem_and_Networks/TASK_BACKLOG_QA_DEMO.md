# TASK BACKLOG — QA E2E & Demo (Agente 05)

> Derivado de la **auditoría 2026-10-13**. Checklist maestro de verificación manual E2E + coordinación de despliegue/material de demo. La app debe correrse en **ambos modos**: mock (`NEXT_PUBLIC_CHAIN_MODE=0`) y on-chain (`=1`).
> Bug conocido a verificar primero: env var del flag (`CHAIN_MODE` vs `CHAIN_ENABLED`) — ver `TASK_BACKLOG3.md` F1. **Si el flag no matchea, todo este checklist corre en mock sin que nadie lo note.**

## 🎯 Estado general
- [ ] F0: Verificación de entorno (pre-condición)
- [ ] F1: Smoke modo mock (fallback de demo)
- [ ] F2: Smoke modo on-chain (el diferenciador)
- [ ] F3: Auditoría de jerga prohibida
- [ ] F4: Coordinación con Agente 02 (verificación explorer)
- [ ] F5: Escaleta de video + submission

---

## 📌 F0 — Pre-condiciones de entorno

- [ ] `git status` limpio y `git log origin/main -3` muestra los últimos commits (auditoría no pudo verificar el push).
- [ ] `.env.local` existe en `03_Frontend_Terminal/app/` con: `NEXT_PUBLIC_CHAIN_MODE`, las 5 addresses de `Contract_Addresses.md`, `NEXT_PUBLIC_PRIVY_APP_ID`, `GAS_FAUCET_PRIVATE_KEY`.
- [ ] `npm run build` verde y `npm run dev` levanta.
- [ ] Confirmar con `cast` que los 5 contratos responden (ej. `cast call <exchange> "arsPerUsd()"`).

## 📌 F1 — Smoke modo mock (flag OFF)

Checklist funcional completo — esta es la red de seguridad si testnet falla en la demo:

- [ ] Login Privy → dashboard muestra saldos ARS/USD
- [ ] "Cargar saldo" → modal Mercado Pago → acreditación visible
- [ ] `/comercio`: editar tarifa, QR visible, killswitch OFF/ON, regenerar QR cierra sesiones activas, reporte diario CSV
- [ ] `/consumo?m=<qr>`: auto-cap → iniciar → timer en vivo → finalizar → resumen con devolución exacta
- [ ] `/acuerdo`: crear → QR/link → `/acuerdo/[id]` depositar 100% → entregar → aprobar etapa → **cancelar bloqueado antes de pagar etapa 1** (`stage0_locked`) → cancelar habilitado después
- [ ] `/enviar`: por alias y por QR → comprobante #ID → historial
- [ ] Feed de actividad unificado muestra todos los eventos

## 📌 F2 — Smoke modo on-chain (flag ON)

Mismo flujo pero verificando contra el explorer — **nunca mostrar addresses/tx en UI**:

- [ ] Login → `/api/gas` fondea la wallet silenciosamente (verificar balance MON en explorer)
- [ ] "Cargar saldo" → `mint` real confirmado en explorer (MockARS/MockUSDC)
- [ ] `/comercio`: `setRate` on-chain → tx en explorer
- [ ] `/consumo`: approve + `startStream` (2 firmas silenciosas) → timer → `stopStream` → evento `StreamSettled` con paid/refund exactos
- [ ] `/acuerdo/[id]`: approve + `createProject` → `deliverStage` → `approveStage` → `cancelProject` → reembolso real en explorer
- [ ] `/enviar` chain: alias → `transfer` ERC-20 real → comprobante con `txRef` interno
- [ ] **Toggle `NEXT_PUBLIC_CHAIN_MODE=0` → mock sigue funcionando** (probar el fallback en vivo)

## 📌 F3 — Auditoría Web3 invisible

- [ ] Recorrer TODA la app en chain mode: cero `0x…`, "gas", "wallet", "hash", "USDC", "smart contract", nombre de red, "Confirmar en Metamask".
- [ ] Probar caminos de error: saldo insuficiente, sesión inexistente, cancelar pre-etapa-1, alias inexistente — todos deben mostrar copy humano, nunca revert reasons ni `error.message`.
- [ ] Registrar cada violación en `Error_Index.md` con captura/pantalla → Agente 03 (F2).

## 📌 F4 — Coordinación con Agente 02

- [ ] Verificar que los 5 contratos figuran ✅ verificados en `Contract_Addresses.md` (o el blocker documentado).
- [ ] Recabar los logs del smoke `cast` en `test_logs/` como evidencia on-chain.

## 📌 F5 — Video demo & submission

- [ ] Escaleta cronometrada del video (duración límite de Metropolis): problema → login invisible → Modo 1 QR → Modo 2 acuerdo → por qué Monad → cierre.
- [ ] Ensayo completo x2 con testnet real (medir latencia RPC; decidir qué modo mostrar en vivo y cuál dejar grabado).
- [ ] `FINAL_SUBMISSION.md` en esta carpeta según `hackathon_submission_checklist.md`: link repo, link video, descripción, stack, addresses.
- [ ] Verificar repo público: sin `.env.local` commiteado, `.gitignore` cubre `.next/`, `node_modules/`, `.env*`.

---

## 🔗 Relacionados
- [Frontend Backlog 3](../03_Frontend_Terminal/TASK_BACKLOG3.md)
- [SC Demo Backlog](../02_SmartContracts_Terminal/TASK_BACKLOG_DEMO.md)
- [Pitch Backlog](../01_Architecture/TASK_BACKLOG_PITCH.md)
- [Contract_Addresses](../04_Deploy_and_Networks/Contract_Addresses.md)
- [Checklist Hackathon](../00_System/Skills/hackathon_submission_checklist.md)
