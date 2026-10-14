# Error Index — QA / Demo

Registro de fallas e inconsistencias detectadas en la verificación E2E.
El índice canónico del agente vive en
[`00_System/Agents_Logs/05_QA_Testing_Demo/Error_Index.md`](../00_System/Agents_Logs/05_QA_Testing_Demo/Error_Index.md).

## 2026-10-13 — Smoke E2E (F1/F2/F3)

| ID | Severidad | Hallazgo | Estado |
| :--- | :--- | :--- | :--- |
| ERR-01 | 🔴 demo-blocking | `/api/gas` top-up 0.05 MON se agotaba a mitad del flujo (~102 gwei → ~0.03 MON/tx). RPC reporta `-32602` en vez de "insufficient funds". | ✅ Fix: `TOP_UP 0.4` / `MIN_BALANCE 0.05` |
| ERR-02 | 🟠 UX (chain) | `merchants()` multi-output decodifica como array en viem → `merchantProfile.disabled`/`ratePerSecond` llegaban `undefined`; el killswitch on-chain no bloqueaba `/consumo`. | ✅ Fix: normalización a objeto en `useMonadStream.ts` |
| — | — | Violaciones de jerga Web3-invisible en copy visible | ✅ 0 encontradas (auditoría estática + HTML servido) |

## ⏳ Pendiente de verificación humana
- Login Privy OAuth real + `QRScanner` con cámara física.
- Ensayo x2 del video en testnet (latencia ya medida: ~1.0s/tx).
