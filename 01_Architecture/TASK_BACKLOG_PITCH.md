# TASK BACKLOG — Pitch & Material de Demo (Agentes 07 Market + 01 PM)

> Derivado de la **auditoría 2026-10-13**. El producto técnico está ~90% listo; este backlog cubre la narrativa y entregables para presentarlo.
> Copropiedad: **Agente 07** lidera narrativa/mercado, **Agente 01** valida alineación con los modos y la Regla de Oro.

## 🎯 Estado general
- [ ] F1: Guion del pitch cronometrado
- [ ] F2: README público del repo
- [ ] F3: Mensajes alineados con lo que realmente existe

---

## 📌 F1 — Guion del pitch (`PITCH_GUION.md`)

- [ ] Estructura cronometrada (problema → solución → demo en vivo → por qué Monad → cierre) respetando el límite de duración de Metropolis.
- [ ] Decidir con QA qué se muestra en vivo vs grabado (fallback mock si testnet falla — nunca decirlo en el pitch, solo ensayar ambos).
- [ ] Momentos de venta on-chain: "esto que ven es una transacción real en Monad" (mostrar explorer solo si el formato lo permite — nunca dentro de la app).
- [ ] Mencionar los 3 modos: consumo por tiempo, acuerdos por etapas con etapa-0-garantizada, transferencias por alias.
- [ ] Diferenciadores a marcar: dual ARS/USD con conversión, dinero protegido 100%, UX Web2 total, 10k TPS/finality de Monad.

## 📌 F2 — README público

- [ ] `README.md` en la raíz del repo: qué es MonadFlow, track, links a demo/landing/addresses, stack, cómo correr (`npm run dev` en app y landing), link al video.
- [ ] Sección "Arquitectura" apuntando a `01_Architecture/` + `Contract_Addresses.md` con links al explorer.
- [ ] Sin jerga confusa: público = jurados técnicos + no técnicos.

## 📌 F3 — Alineación messaging ↔ realidad

- [ ] Revisar que el copy de landing/pitch **no prometa lo que no existe**: paymaster real (hoy gas vía faucet — decir "sin costo para el usuario", no "ERC-4337"), disputas con agente (futuro), nombre de comercio on-chain (off-chain hoy).
- [ ] Modo 3 P2P ya está implementado — verificar que landing/pitch lo mencionen si va a mostrarse.
- [ ] `MARKET_STRATEGY.md` actualizado con estado real (o al menos sin contradicciones).

---

## 🔗 Relacionados
- [Contexto Maestro](../00_System/CONTEXTO_MAESTRO.md)
- [QA Demo Backlog](../05_PostMortem_and_Networks/TASK_BACKLOG_QA_DEMO.md)
- [Market Strategy](MARKET_STRATEGY.md) (si existe)
- [Checklist Hackathon](../00_System/Skills/hackathon_submission_checklist.md)
- [Contract_Addresses](../04_Deploy_and_Networks/Contract_Addresses.md)
