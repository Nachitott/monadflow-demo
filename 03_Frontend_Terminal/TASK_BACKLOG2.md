# TASK BACKLOG 2 — Migración híbrida mock → on-chain (Monad Testnet)

> Continuación de [[TASK_BACKLOG.md]] (Fases 1–5.5 completadas: mock funcional con UX según boceto).
> Este backlog cubre el paso de ejecución simulada a ejecución real sobre los contratos de
> `02_SmartContracts_Terminal/` (`TimeStream`, `MilestoneEscrow`, `MockUSDC`, `MockARS`, `MockExchange`).
>
> **Decisiones vigentes (aprobadas):**
> - Deploy de contratos **al final**, cuando el frontend esté listo para testear.
> - Gas: **faucet** (`/api/gas` envía MON a la embedded wallet). ERC-4337/paymaster queda para después.
> - **Feature flag**: mock sigue siendo el default; chain mode se activa por `NEXT_PUBLIC_CHAIN_MODE=1`
>   + addresses en `.env.local`. El mock nunca se rompe.
> - UX Web3 invisible: jamás se muestran addresses, hashes, "gas", "wallet", nombres de red.
>
> Leyenda: ✅ hecho · 🚧 en curso / parcial · ☐ pendiente

---

## F0 — Fundación on-chain ✅

Infraestructura mínima para que la app pueda hablar con la chain sin romper el mock.

- [x] Copiar ABIs exportados a `app/src/lib/abis/` (`TimeStream`, `MilestoneEscrow`, `MockUSDC`, `MockARS`, `MockExchange`)
- [x] `src/lib/contracts.ts` — addresses + ABIs centralizados, helpers `toUnits`/`fromUnits`, `CURRENCY_TYPE`, `chainReady` (flag + todas las addresses presentes)
- [x] `src/lib/chainMode.ts` — `CHAIN_ENABLED` (`NEXT_PUBLIC_CHAIN_MODE=1`)
- [x] `providers.tsx` — embedded wallet silenciosa (`embeddedWallets.showWalletUIs: false`, `createOnLogin: 'users-without-wallets'`)
- [x] `app/api/gas/route.ts` — faucet de MON: `POST /api/gas { address }` → envía MON desde `GAS_FAUCET_PRIVATE_KEY`, con cooldown por address
- [x] Typecheck limpio (`tsc --noEmit`)

## F1 — Wallet dual, rampa y cotización ✅

La home ya puede cargar saldo real y leer balances/precio desde la chain.

- [x] `useContractTx` — `send()` (writeContract + wait receipt) y `ensureApproval(token, owner, spender, amount)`
- [x] `useDualWallet` — lee `balanceOf` de MockARS/MockUSDC de la embedded wallet (+ MON nativo)
- [x] `useGasFaucet` — llama `/api/gas`, devuelve estado silencioso (sin copy técnico)
- [x] `useExchangeRate` — lee `arsPerUsd()` de `MockExchange` on-chain con fallback a la cotización mock
- [x] `BalanceContext` — rama chain: balances desde `useDualWallet` cuando `chainReady`; mock intacto cuando no
- [x] `page.tsx` — "Cargar saldo" en chain mode ejecuta `mint` público de MockARS/MockUSDC + faucet silencioso previo

## F2 — Modo 1: consumo por tiempo (TimeStream) ✅

| Ítem | Estado |
| :--- | :--- |
| `useMonadStream` — lecturas (`merchants`, `getSession`, `getUserSessions`, `getMerchantSessions`, `accrued` local) y escrituras (`setRate`, `deactivateQR`/`reactivateQR`, `startStream` con approve, `stopStream` con parse de `StreamStarted`/`StreamSettled`) | ✅ |
| `/consumo` chain mode: `?m=` = address del comercio, perfil desde `merchants()`, resume de sesión activa, approve+`startStream`, poll de cierre por el comercio, `stopStream` + resumen real (paid/refunded) | ✅ |
| `/comercio` chain mode: `setRate` al editar tarifa, killswitch → `deactivateQR`/`reactivateQR`, QR del comercio con link `/consumo?m=<address>`, grilla de clientes activos desde `getMerchantSessions` + `getSession` | ✅ |
| Nombre del comercio on-chain (hoy se muestra el nombre del registro mock, solo presentación; el contrato no tiene campo de nombre) | Diferido — registry off-chain o campo en perfil, no bloquea |
| `npm run build` verde + smoke mock mode (home, consumo, comercio, sesión create/close, merchant deactivate/regenerate) | ✅ |

## F3 — Modo 2: acuerdos por etapas (MilestoneEscrow) ☐

- [ ] `useMilestoneEscrow` — `createProject`, `deposit`, `release`, `refund`, lecturas de proyecto/etapas
- [ ] `/acuerdo` híbrido: crear borrador off-chain (como hoy) y, en chain mode, ejecutar `createProject` + `deposit` al confirmar
- [ ] `/acuerdo/[id]` chain mode: estado de etapas desde el contrato, `release`/`refund` por etapa
- [ ] Preservar 100% el flujo mock cuando el flag esté apagado

## F4 — P2P por alias con ERC-20 ☐

- [ ] `aliases` (store): agregar `walletAddress` asociada al alias (se registra al crear/reclamar alias)
- [ ] `useTransfers` rama chain: `transfer` del MockARS/MockUSDC a la address del destinatario
- [ ] `/enviar` chain mode: resolver alias → address, send on-chain, feedback con "Comprobante #ID" (nunca hash)
- [ ] "Recibir": el QR personal codifica `/enviar?to=<alias>` (sin exponer `0x…` en la UI)

## F5 — Actividad unificada + cierre ☐

- [ ] `POST /api/activity` — endpoint para registrar eventos on-chain (mint/depósito, stream start/stop, escrow deposit/release/refund, transfer P2P) junto a los mock
- [ ] Integrar el POST en cada flujo chain para que el feed unificado muestre ambos mundos sin duplicados
- [ ] `.env.example` completo: `NEXT_PUBLIC_CHAIN_MODE`, addresses de los 5 contratos, `GAS_FAUCET_PRIVATE_KEY` (solo server)
- [ ] Actualizar docs: `TASK_BACKLOG.md` (puntero a este archivo), `04_Deploy_and_Networks/`, contexto si cambian decisiones

## Final — Verificación y deploy ☐

- [ ] `npm run build` verde
- [ ] Smoke mock mode (flag off): home, consumo, comercio, acuerdo, enviar — todo como antes
- [ ] Deploy de los 5 contratos a Monad Testnet (script Foundry existente en `02_SmartContracts_Terminal`)
- [ ] Cargar addresses en `.env.local` + `.env.example`, `NEXT_PUBLIC_CHAIN_MODE=1`
- [ ] Smoke chain mode: faucet → mint → consumo start/stop → acuerdo → P2P
- [ ] Actualizar `04_Deploy_and_Networks/Contract_Addresses.md` solo cuando el deploy sea real
- [ ] Commit + merge a `main`

## Futuro (fuera de este backlog)

- ERC-4337 + paymaster real (hoy el gas sale del faucet)
- EIP-712 vouchers de tarifa del comercio
- Orquestador de agentes (cierre automático de sesiones, auto-release, disputas) — `06_Agent_Orchestrator/`
