# Error Index

Registro de errores y soluciones.

* [Volver al Contexto Maestro](../../CONTEXTO_MAESTRO.md)

---

## 2026-10-13 — Hallazgos del smoke E2E

### ERR-01 · `/api/gas` — top-up insuficiente para el flujo completo (resuelto)

- **Síntoma:** `stopStream` (y cualquier tx posterior del usuario) fallaba con `Missing or invalid parameters` (-32602) durante el smoke on-chain.
- **Causa raíz:** la wallet QA recibió `TOP_UP = 0.05 MON`; a ~102 gwei de gas price, approve+startStream consumieron ~0.042 MON → restaban 0.0078, insuficiente para estimar gas de la siguiente tx. El RPC de Monad devuelve `invalid params` (no "insufficient funds"), lo que enmascara la causa. Además `MIN_BALANCE = 0.01` marcaba como "fondeada" una wallet que no paga ni una tx.
- **Fix:** `TOP_UP 0.05 → 0.4 MON`, `MIN_BALANCE 0.01 → 0.05` en `src/app/api/gas/route.ts` (+ comentario con el razonamiento). Suficiente para ~10 txs del recorrido de demo con margen. Faucet deployer: 3.2 MON → cubre ~8 usuarios/demo.
- **Verificación:** re-run `chain_smoke.mjs` → 17/17 PASS. Si se esperan más usuarios de demo que eso, re-fondear el faucet desde faucet.monad.xyz.
- **Archivo:** `03_Frontend_Terminal/app/src/app/api/gas/route.ts`

### ERR-02 · `merchants()` decode — array posicional vs objeto nombrado (resuelto)

- **Síntoma:** en el smoke on-chain, tras `deactivateQR` exitoso, `merchants(deployer).disabled` leía `undefined` (esperado `true`).
- **Causa raíz:** viem decodifica **public getters multi-output** como array posicional `[ratePerSecond, rateCurrency, disabled]` — no como objeto — aunque el ABI tenga `name` en los outputs (verificado empíricamente: `isArray: true, keys: ['0','1','2']`). `useMonadStream.merchantProfile()` hacía `p.disabled` / `p.ratePerSecond` por nombre → todo `undefined`. **Impacto real en la app (chain mode):** `p.disabled` falsy → un QR desactivado on-chain NO bloqueaba el check-in en la UI (solo lo frenaba el revert del contrato al `startStream`); `fromUnits(undefined)` podía romper la pantalla `/consumo` sin catch.
- **Fix:** normalizar el decode a objeto en `merchantProfile` (`Array.isArray(raw) ? {ratePerSecond: raw[0], …} : raw`). Un solo sitio afectado: es el único `readContract` multi-output de la app — `getSession`/`getProject` devuelven tuples (1 output) que sí decodifican a objeto; `getMilestones` es `tuple[]` (array de objetos, OK).
- **Verificación:** `npx tsc --noEmit` limpio; re-run `chain_smoke.mjs` → `Killswitch on-chain (disabled=true)` PASS.
- **Archivo:** `03_Frontend_Terminal/app/src/lib/hooks/useMonadStream.ts` (líneas ~57-80)

### Notas — comportamientos correctos que parecen errores pero no lo son

- **"QA debitado" del smoke:** `startStream` transfiere el `maxCap` entero al contrato y `stopStream` devuelve el excedente — el delta neto del user es `paid`, pero medido post-deposit vs post-settle es `+refunded`. Invariante correcta verificada: `paid + refund == cap` y `balAfter - balBefore == refunded`.
- **`revert` on-chain reportado por el RPC como `-32602 invalid params`:** al estimar gas, Monad testnet a veces no devuelve el revert reason. Para QA: si una tx ni siquiera se envía, revisar primero **balance de MON del sender**.
- **`error.message` nunca llega a pantalla:** `friendlyError.errorCode` extrae `snake_case` estable y `humanError` mapea a copy es-AR; los errores del API se previenen por UI (botones deshabilitados). Cero violaciones de jerga en la auditoría F3.

