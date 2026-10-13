# TASK BACKLOG — Finalización Demo (Smart Contracts / Agente 02)

> Backlog de cierre pre-demo derivado de la **auditoría 2026-10-13**. Todo el código ya está deployado a Monad Testnet; este backlog cubre verificación, consistencia de env vars y evidencia para el jurado.
> Los 5 contratos están live — addresses en `04_Deploy_and_Networks/Contract_Addresses.md`.

## 🎯 Estado general
- [x] F1: Verificación de contratos en el explorer — ✅ 2026-10-13 (5/5 `exact_match` vía Sourcify/MonadVision)
- [x] F2: Consistencia de configuración (env vars / docs) — ✅ 2026-10-13 (docs ya alineados a `NEXT_PUBLIC_CHAIN_MODE`; fix de código queda en Agente 03)
- [x] F3: Evidencia técnica para el jurado — ✅ 2026-10-13 (broadcast commiteado + smoke on-chain + checklist)

---

## 📌 F1 — Verificación en MonadExplorer

Los 5 contratos figuran `❌ No verificado` en `Contract_Addresses.md`. Verificarlos suma credibilidad — el jurado puede leer el código on-chain.

- [x] `forge verify-contract` para cada contrato deployado — **todos `exact_match` vía Sourcify de BlockVision** (`--verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/ --chain-id 10143`), backend de MonadVision/MonadExplorer:
  - `MockUSDC` `0x27BE5512a477045EF270EE16c804776D6269663C` ✅
  - `MockARS` `0x1569b7c9115DF4AFeE1C71689D8E390bceea4958` ✅
  - `MockExchange` `0x1C87797a412519BbB4AB62e29E24D2530E200026` (ctor args: usdc, ars, 1200e18) ✅
  - `TimeStream` `0xE3209E6b0CC93BCBc05067956ACd1Cf1ec8118C8` (ctor args: usdc, ars) ✅
  - `MilestoneEscrow` `0xA8f6Fc4a96AD87B4ac4f93cE6F05F9e208d6d817` (ctor args: usdc, ars) ✅
- [x] ~~Si el explorer no soporta verificación estándar, documentar el blocker~~ — **no aplica**: `testnet.monadexplorer.com` redirige a MonadVision, que soporta verificación Sourcify estándar sin API key. Verificado server-side con `check-by-addresses` (los 5 reportan `status: "perfect"`).
- [x] Actualizar columna "Verificado" en `Contract_Addresses.md` → `✅ Sí` ×5 + nota de método.
  - Pendiente (opcional, requiere `ETHERSCAN_API_KEY`): verificación espejo en Monadscan (Etherscan).

## 📌 F2 — Consistencia de config

- [x] **🔴 BUG env var (coordinar con Agente 03):** el código de la app lee `NEXT_PUBLIC_CHAIN_ENABLED` pero la documentación y `.env.example` dicen `NEXT_PUBLIC_CHAIN_MODE`. Decisión tomada: unificar en `NEXT_PUBLIC_CHAIN_MODE`. La corrección de código es del Agente 03; **esta tarea es solo verificar** que `Monad_Testnet_Config.md`, `Contract_Addresses.md` y `.env.example` queden alineados con la var final elegida.
  - **Verificado 2026-10-13:** `Monad_Testnet_Config.md` §D (l.77), `Contract_Addresses.md` (l.27) y `03_Frontend_Terminal/app/.env.example` (l.10) ya usan `NEXT_PUBLIC_CHAIN_MODE`. Único punto desalineado: `app/src/lib/chainMode.ts` (lee `CHAIN_ENABLED`) → fix en `03_Frontend_Terminal/TASK_BACKLOG3.md`, fuera de mi dominio.
- [x] Confirmar que `Monad_Testnet_Config.md` §D lista todas las vars del modo on-chain — **verificado**: 5 addresses + `NEXT_PUBLIC_CHAIN_MODE` + `GAS_FAUCET_PRIVATE_KEY` (server-only). Coincide 1:1 con `.env.example`.

## 📌 F3 — Evidencia para el jurado

- [x] Dejar `broadcast/Deploy.s.sol/10143/run-latest.json` commiteado — `broadcast/` removido del `.gitignore` local (queda ignorado solo `*.recovery.lock`).
- [x] Guardar salida de `cast` del smoke on-chain en `test_logs/` — `test_logs/2026-10-13_demo_f3_cast_smoke.log`. Script reutilizable: `script/smoke-onchain.sh`. Ejecuta mint→approve→startStream→accrual→stopStream en vivo + lecturas de los 5 contratos y estado histórico (sesión `0x415b…`, proyecto `0x8c06…` con Etapa 1 aprobada). Txs: `0x1c9fe6ac…` (mint), `0xee3512e9…` (startStream), `0xe9cf9971…` (stopStream) — block ~70801700, chain 10143.
- [x] Checklist de seguridad listo para mencionar en pitch — `SECURITY_CHECKLIST.md`: CEI, ReentrancyGuard en payouts, escrow por sesión, etapa 0 intocable, matriz de access control (refs `Modelado_SmartContracts.md` §3).

## 📌 Fuera de alcance (post-demo, ya documentado)

- Paymaster ERC-4337 real, vouchers EIP-712, disputas con agente (hooks ya están en contrato).

---

## 🔗 Relacionados
- [Backlog principal](TASK_BACKLOG.md) · [Contract_Addresses](../04_Deploy_and_Networks/Contract_Addresses.md) · [Monad_Testnet_Config](../04_Deploy_and_Networks/Monad_Testnet_Config.md) · [QA Demo Backlog](../05_PostMortem_and_Networks/TASK_BACKLOG_QA_DEMO.md) · [Frontend Backlog 3](../03_Frontend_Terminal/TASK_BACKLOG3.md)
