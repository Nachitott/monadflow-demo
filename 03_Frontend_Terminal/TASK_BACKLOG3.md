# TASK BACKLOG 3 — Finalización Demo (Frontend / Agente 03)

> Derivado de la **auditoría 2026-10-13**. El modo on-chain está implementado (F0–F5 de `TASK_BACKLOG2` ✅); este backlog cubre el bug crítico del flag, sanitización de errores on-chain, pulido mobile y soporte al smoke E2E de QA.
> Referencias: [[TASK_BACKLOG.md]] (mock) · [[TASK_BACKLOG2.md]] (migración on-chain).

## 🎯 Estado general
- [ ] F1: Bug crítico — env var del flag + `.env.local`
- [ ] F2: Sanitización de errores on-chain (Web3 invisible)
- [ ] F3: Pulido mobile-first
- [ ] F4: Soporte a smoke E2E (coordinado con QA-05)

---

## 📌 F1 — 🔴 Bug crítico: env var del flag

**Problema:** `src/lib/chainMode.ts` lee `NEXT_PUBLIC_CHAIN_ENABLED`, pero `.env.example`, `TASK_BACKLOG2` y `Contract_Addresses.md` documentan `NEXT_PUBLIC_CHAIN_MODE`. Quien copie `.env.example` queda en modo mock **sin saberlo**.

- [ ] Unificar en **`NEXT_PUBLIC_CHAIN_MODE`** (decisión tomada): cambiar `chainMode.ts` para leer `NEXT_PUBLIC_CHAIN_MODE === '1'`.
- [ ] Actualizar el comentario de `chainMode.ts` y cualquier doc que diga `CHAIN_ENABLED`.
- [ ] Crear `.env.local` (gitignored) con las 5 addresses de `Contract_Addresses.md`, `NEXT_PUBLIC_CHAIN_MODE=1`, `NEXT_PUBLIC_PRIVY_APP_ID` y `GAS_FAUCET_PRIVATE_KEY` (server-only).
- [ ] Guardrail: log único en `page.tsx`/providers (`console.info('[monadflow] mode:', 'chain' | 'mock')`) solo en dev — nada visible en UI. Detecta silenciosamente caídas a mock por env mal configurada.
- [ ] Rebuild + verificar que `/api/gas` responde `funded` en ambiente local.

## 📌 F2 — Sanitización de errores on-chain

Los reverts/rejections de wagmi pueden filtrar texto técnico en la UI ("execution reverted", "User rejected", hashes).

- [ ] Wrapper central en `useContractTx.send` / error boundary por flujo: mapear **todo** error a copy amigable es-AR ("No se pudo procesar la solicitud, intentá nuevamente"). Nunca mostrar `error.message` crudo.
- [ ] Auditar pantallas con copy técnico potencial: `/consumo`, `/comercio`, `/acuerdo`, `/acuerdo/[id]`, `/enviar`, `BalanceCard`, modales de killswitch/cancelación.
- [ ] Chequeo manual final: recorrer la app en chain mode buscando `0x`, "gas", "wallet", "hash", "USDC", "transaction", nombre de red — cero tolerancia (regla §2 `REGLAS_AGENTES`).
- [ ] Errores esperables ya mapeados (`recipient_not_ready`, `alias_not_found`, `stage0_locked`...) — verificar que todos tengan copy humano.

## 📌 F3 — Pulido mobile-first

- [ ] Revisar `/consumo` y `/acuerdo/[id]` en viewport 375px: timer legible, botón primario reachable, sin scroll horizontal.
- [ ] `QRScanner` en dispositivo real (permiso de cámara, fallback al link manual `?m=`/`?to=`).
- [ ] Números vivos (timer, acumulado, balances) con `font-mono tabular-nums`.
- [ ] `BottomNav` cubre todos los destinos principales (incluye `/enviar`).

## 📌 F4 — Soporte a smoke E2E (con QA-05)

- [ ] Tener corriendo `npm run dev` en chain mode durante el checklist del Agente 05 (ver `TASK_BACKLOG_QA_DEMO.md`).
- [ ] Fix rápido de cualquier bloqueador que QA registre en su `Error_Index.md`.
- [ ] Confirmar doble ruta de demo: `NEXT_PUBLIC_CHAIN_MODE=1` (real) y `=0` (fallback) — ambas navegables.

---

## 🔗 Relacionados
- [QA Demo Backlog](../05_PostMortem_and_Networks/TASK_BACKLOG_QA_DEMO.md)
- [SC Demo Backlog](../02_SmartContracts_Terminal/TASK_BACKLOG_DEMO.md)
- [Contract_Addresses](../04_Deploy_and_Networks/Contract_Addresses.md)
- [Work Journal](../00_System/Agents_Logs/03_Frontend_UX/Work_Journal.md)
