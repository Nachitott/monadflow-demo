# Work Journal

Bitácora de trabajo para este perfil.

* [Volver al Contexto Maestro](../../CONTEXTO_MAESTRO.md)

---

## 2026-10-13 — Ejecución completa de `TASK_BACKLOG_QA_DEMO` (F0–F5)

**Rol asumido:** Agente 05 QA Testing & Demo Director. Sesión de verificación E2E integral.

### F0 — Entorno ✅
- `git status` limpio; `origin/main` contiene el merge `2320000` con el fix del flag (el push que la auditoría no pudo verificar, quedó confirmado).
- `.env.local` completo: `CHAIN_MODE`, 5 addresses (matchean `Contract_Addresses.md`), Privy ID, `GAS_FAUCET_PRIVATE_KEY`.
- `npm run build` verde (6 páginas + 10 API routes), `npm test` (vitest) **23/23**.
- Sin `cast`/`forge` en esta máquina → verifiqué los 5 contratos por JSON-RPC: bytecode presente + `arsPerUsd() = 1200e18`. RPC ~0.8s, testnet viva.

### F1 — Smoke mock ✅ 38/38 PASS
Escribí `05_PostMortem_and_Networks/qa_logs/smoke_e2e.mjs` (script reproducible) y corrí contra dev server en `:3001` con `NEXT_PUBLIC_CHAIN_MODE=0`. Cubre: tarifa/killswitch/regenerar-QR-cierra-sesiones, check-in con auto-cap, regla `active_session`, cierre con devolución, acuerdo completo (**`stage0_locked` verificado**, deliver-sin-autorización → 403, refund exacto), alias/P2P/comprobante, feed unificado con los 8 kinds de eventos, y paths de error.
Log: `qa_logs/2026-10-13_smoke_mock.log`.

### F2 — Smoke on-chain ✅ 17/17 PASS (tras 2 fixes)
Escribí `qa_logs/chain_smoke.mjs`: ejecuta los flujos reales de la app contra Monad Testnet con cuentas reales (QA user nuevo + deployer). Cobertura con txs confirmadas:
- `/api/gas` fondea wallet nueva → 0.4 MON en ~0.6s
- mint mARS/mUSDC, `setRate`, approve+`startStream`→`stopStream` (`StreamSettled` paid=2/refund=8 de cap=10, devolución exacta), killswitch on-chain
- `createProject` (escrow 100%) → **`cancelProject` revierte pre-etapa-1** → `deliverStage`→`approveStage` (cobro 5 ARS) → `cancelProject` con reembolso real
- `transfer` ERC-20 P2P con comprobante `txRef`, `swapARSforUSDC` +1 USD @1200
- **Latencia: avg ~1.0s, min 0.55s, max 1.6s** por confirmación — el claim de Monad se sostiene en vivo.
- Fallback verificado en vivo: mock (:3001) y chain (:3000) corrieron en simultáneo.
Log: `qa_logs/2026-10-13_smoke_chain.log`.

### F3 — Auditoría Web3 invisible ✅ 0 violaciones
- Grep exhaustivo sobre `src/**/*.tsx` en posiciones visibles (texto JSX, props `label`/`title`/`placeholder`/`aria-label`, strings de error): **0 hits** de wallet/gas/hash/USDC/escrow/testnet/metamask/0x…/smart contract.
- HTML servido de las 5 rutas (stripped de scripts): limpio.
- `friendlyError.ts`: todo error lanzado → copy es-AR; `error.message` jamás renderizado. Errores del API (`stage0_locked`, `alias_not_found`, `merchant_inactive`…) se manejan por UI preventiva (botones deshabilitados + copy humano) — verificado en `/acuerdo/[id]` y `/consumo`.

### F4 — Coordinación Agente 02 ✅
- `Contract_Addresses.md`: los 5 contratos ✅ verificados `exact_match` (Sourcify/BlockVision).
- `test_logs/`: 77 forge tests PASS + `demo_f3_cast_smoke.log` con txs `cast` reales (mint→approve→startStream→stopStream + estados post).
- Mi `chain_smoke.mjs` suma evidencia E2E con user/merchant separados + latencias.

### F5 — Video + submission ✅ (grabación = paso manual)
- `DEMO_VIDEO_SCRIPT.md`: escaleta de 8 escenas, 2:45–2:55 (límite 3:00), con checklist de setup, producción y post.
- `FINAL_SUBMISSION.md`: repo público verificado (github.com/Nachitott/monadflow-demo), descripción, stack, addresses, evidencia. Falta pegar el link del video.
- Repo público: `.gitignore` cubre `.env*`/`.next/`/`node_modules/`; `git ls-files` → solo `.env.example` trackeado, cero secrets.

### 🐛 Bugs encontrados y corregidos (fixtures/demo-prep, permitidos por perfil)
1. **`/api/gas` top-up insuficiente** — `TOP_UP 0.05→0.4 MON`, `MIN_BALANCE 0.01→0.05`. A ~102 gwei, 0.05 MON se agotaba a mitad del flujo (approve+start+stop ≈ 0.06) → el usuario quedaba sin gas en la demo. Detalle en `Error_Index.md`.
2. **`useMonadStream.merchantProfile` leía `merchants()` por nombre** — viem devuelve array posicional para getters multi-output → `disabled`/`ratePerSecond` llegaban `undefined`: el killswitch on-chain no bloqueaba el check-in en UI y la tarifa se rompía. Normalizado a objeto. `tsc --noEmit` limpio.

### ⏳ Pendiente manual (requiere humano)
- Login Privy OAuth real en browser + `QRScanner` con cámara en dispositivo físico.
- Grabación del video con la escaleta y ensayo x2 (recomendado: chain mode, mock de respaldo).
- Pegar link del video en `FINAL_SUBMISSION.md`.

### Archivos tocados/creados
- Editado: `app/src/app/api/gas/route.ts`, `app/src/lib/hooks/useMonadStream.ts`
- Creados: `05_PostMortem_and_Networks/{DEMO_VIDEO_SCRIPT.md, FINAL_SUBMISSION.md, qa_logs/smoke_e2e.mjs, qa_logs/chain_smoke.mjs, qa_logs/*.log}`
- Actualizado: `TASK_BACKLOG_QA_DEMO.md` (todos los checkboxes)
