# Escaleta de Video Demo — MonadFlow (Hackathon Monad Metropolis)

> **Duración objetivo: 2:45–2:55** (límite Metropolis: 3:00). Grabada en una sola toma por pantalla + narración. Si el RPC está lento el día de grabación, el fallback es correr la app en mock (`NEXT_PUBLIC_CHAIN_MODE=0`) — el checklist F1 ya verificó que ambos modos son navegables.

## 📋 Setup previo a la grabación
- [ ] Dev server en chain mode (`NEXT_PUBLIC_CHAIN_MODE=1`), dos perfiles de browser listos (cliente + comercio/contratista).
- [ ] Cuenta cliente con saldo ARS/USD ya cargado (mint on-chain vía "Cargar saldo").
- [ ] Comercio con `setRate` ya hecho on-chain (evita esperar la tx en cámara).
- [ ] Acuerdo draft creado pre-grabación (el QR/link ya existe) — el depósito se filma en vivo.
- [ ] Explorer abierto en una pestaña oculta, listo para mostrar la tx si el jurado pregunta.

## 🎬 Escenas cronometradas

| # | Tiempo | Escena | Qué se muestra / narración |
| :-- | :-- | :-- | :-- |
| 1 | 0:00–0:18 | **Problema** | "En Argentina cobrar por tiempo (cowork, gym, parking) o garantizar un trabajo freelance significa confiar ciegamente o pagar comisiones del 3-5%. MonadFlow lo resuelve con dinero programable que el usuario ni siquiera ve." |
| 2 | 0:18–0:38 | **Login invisible** | Un clic → login con Google. Dashboard con dos saldos: **Pesos (ARS)** y **Dólares (USD)**. "Sin extensión, sin frase semilla, sin costo de red. Para el usuario es Mercado Pago con superpoderes." |
| 3 | 0:38–0:55 | **Carga fiat** | "Cargar saldo" → modal estilo Mercado Pago → $10.000 ARS acreditados al instante. *(On-chain: mint real — invisible para el usuario.)* |
| 4 | 0:55–1:30 | **MODO 1 — Pago por uso** | Vista del comercio: tarifa/minuto + QR en pantalla. Cliente escanea → elige **tope máximo de gasto** → "Iniciar". Timer corriendo + monto acumulándose en vivo (`font-mono tabular-nums`). "Finalizar" → resumen con **devolución exacta** del saldo no usado. Mostrar killswitch del comercio y el CSV de cierre. |
| 5 | 1:30–2:10 | **MODO 2 — Acuerdo protegido** | Contratista crea acuerdo "Landing page" $90.000 ARS en 3 etapas → comparte link. Cliente abre `/acuerdo/[id]` → "Fondo de garantía protegido" → **deposita el 100%** (queda congelado). Contratista entrega etapa 1 → cliente **"Aprobar"** en 1 clic → etapa 1 liberada. Mostrar que **cancelar está bloqueado hasta pagar la etapa 1** (regla de compromiso sellado) y que después devuelve el 100% de lo restante. |
| 6 | 2:10–2:30 | **MODO 3 — Envío P2P** | `/enviar` → alias `nacho.mp` o QR personal → $1.500 ARS → **Comprobante #ID** inmediato + historial. "De toda la vida, pero instantáneo." |
| 7 | 2:30–2:50 | **Por qué Monad** | "Cada segundo de la demo fue una transacción real: 10.000 TPS y finalidad de ~1 segundo hacen posible cobrar por segundo sin colas ni latencia. El paralelismo de la EVM permite miles de check-ins simultáneos. Todo invisible: cuentas embebidas, gas patrocinado, cero jerga." *(Mostrar 1 tx del stream en el explorer si hay tiempo.)* |
| 8 | 2:50–2:55 | **Cierre** | "MonadFlow: pagos en tiempo real y acuerdos con dinero 100% protegido — con la UX que tu abuela ya sabe usar." Logo + repo on screen. |

## 🎙️ Notas de producción
- Grabar a 1080p, cursor visible, zoom del navegador al 110% (los montos deben leerse en thumbnail).
- Latencia RPC medida en smoke: **~1.0s por confirmación** — narrar encima, nunca esperar en silencio.
- Corte de seguridad: si una tx cuelga >5s, mencionar que el detalle on-chain se ve en el explorer (pestaña preparada).
- El video termina en "Comprobante #" / "Acuerdo completado" — nunca en un hex.

## ✅ Checklist post-grabación
- [ ] Duración ≤ 3:00 exportada.
- [ ] Frame por frame: cero `0x…`, "gas", "wallet", "USDC", "hash", nombre de red visibles.
- [ ] Audio claro del pitch de Monad en escena 7.
- [ ] Subir a YouTube/Drive con link público → pegarlo en `FINAL_SUBMISSION.md`.
