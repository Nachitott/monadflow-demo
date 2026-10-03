# PITCH_SLIDES — MonadFlow (v1.0)

> **Qué es este archivo:** pitch estructurado slide por slide, listo para pegar en una IA generadora de presentaciones (Gamma, Tome, SlidesAI, etc.). Cada slide tiene **título**, **texto en pantalla** (bullets cortos) y **notas del orador** (lo que se dice, no lo que se muestra).
>
> **Copropiedad:** Agente 07 (Market Strategy — narrativa) + Agente 01 (PM — alineación de producto). Complementa a [PITCH_GUION.md](PITCH_GUION.md) (versión hablada cronometrada).
>
> **Regla de copy:** cero jerga cripto en los textos visibles. **Sí se nombra Monad y blockchain** — el jurado evalúa el track sobre Monad.

---

## Instrucciones sugeridas para la IA de slides (copiar junto al contenido)

```
Generá una presentación de 10 slides para un pitch de hackathon.
Tono: profesional, directo, en español rioplatense (voseo).
Estilo visual: modo oscuro (fondo azul noche), acentos índigo/violeta; Modo 1 en verde esmeralda, Modo 2 en cian.
Público: jurado técnico-business del track "Consumer Products & Payments" de Monad Metropolis.
Restricción: no usar las palabras "wallet", "gas", "USDC", "smart contract", "hash" en ningún slide. Sí se puede nombrar Monad y blockchain.
```

---

## Slide 1 — Portada

**Título:** MonadFlow

**Texto en pantalla:**
- *Pagás por lo que usás. Tu plata, protegida por etapas.*
- Track Consumer Products & Payments · Monad Metropolis

**Notas del orador:** Presentación del equipo y del nombre. Una sola frase: "Somos MonadFlow, la infraestructura de pagos del consumo real."

---

## Slide 2 — El problema (dos dolores, un mercado)

**Título:** El dinero no se mueve al ritmo del consumo real

**Texto en pantalla:**
- Pagás un mes de gimnasio y vas tres veces. El coworking te cobra el día entero por dos horas de uso.
- Del otro lado: encargar un trabajo es un salto de fe — el cliente teme pagar por adelantado, el trabajador teme trabajar gratis.
- Hoy se "resuelve" con señas informales o escrows que cuestan 2–5%.

**Notas del orador:** Dos dolores complementarios: por un lado se paga de más (tiempo no usado), por el otro se arriesga la plata (trabajo sin garantía). Son la misma falla: el dinero no tiene lógica de consumo ni de garantía.

---

## Slide 3 — La solución

**Título:** Una cuenta, dos modos de cobro inteligente

**Texto en pantalla:**
- **Modo 1 — Pago por uso:** escaneás un QR y tu saldo se descuenta segundo a segundo, solo por lo que consumís. Tope de gasto configurable.
- **Modo 2 — Dinero protegido por etapas:** el cliente deposita el 100% del acuerdo en un fondo de garantía protegido; el dinero se libera etapa por etapa con un clic.
- Experiencia tan simple como Mercado Pago. En pesos o en dólares.

**Notas del orador:** Mismo dinero, dos lógicas: streaming por consumo para servicios por tiempo, custodia fraccionada para trabajos por encargo.

---

## Slide 4 — Modo 1 en acción: pago por uso

**Título:** Entrás, escaneás, pagás solo lo que usás

**Texto en pantalla:**
- Un único QR por comercio — sin punto de venta costoso.
- El cliente fija su tope máximo de gasto antes de empezar.
- El comercio ve en vivo quién está consumiendo, cuánto tiempo y cuánto acumula.
- Cierre de jornada con reporte exportable.

**Notas del orador:** Caso: coworking. El cliente escanea, el contador corre, se va a las dos horas y paga dos horas — no el día entero. El comercio monetiza el uso real y recupera clientes que no pagarían una suscripción.

---

## Slide 5 — Modo 2 en acción: dinero protegido por etapas

**Título:** Nadie trabaja gratis, nadie paga a ciegas

**Texto en pantalla:**
- El cliente deposita el 100% del acuerdo antes de empezar — el trabajador ve la garantía total.
- El dinero se divide en etapas; cada entrega se aprueba con un clic.
- Si el cliente no responde, la etapa se auto-aprueba por temporizador.
- Si se cancela, se devuelve el 100% de lo aún no aprobado. La primera etapa ya pagada queda sellada.

**Notas del orador:** Caso: freelance. Reemplaza la seña informal (sin garantía) y el escrow bancario (2–5%, lento, opaco) por un acuerdo automático y auditable.

---

## Slide 6 — Mercado

**Título:** A quién le vendemos

**Texto en pantalla:**
- **Comercios por tiempo:** gimnasios, coworkings, salas de ensayo, estacionamientos — quieren monetizar el uso real sin fricción.
- **Servicios profesionales:** freelancers, contratistas, consultores — necesitan certeza de cobro antes de arrancar.
- **Consumidores urbanos:** hartos de suscripciones que no aprovechan y anticipos sin garantía.
- Mercado inicial: Argentina — economía dual ARS/USD con necesidad real de protección inflacionaria.

**Notas del orador:** Empezamos por Argentina porque el dolor es extremo: inflación, desconfianza en anticipos, cultura Mercado Pago/CVU. El producto opera nativamente en pesos y dólares — el usuario elige en qué moneda conservar su dinero.

---

## Slide 7 — Por qué nosotros y no otra empresa

**Título:** Las alternativas cobran de más o no garantizan nada

**Texto en pantalla (tabla):**

| Alternativa | Su límite | MonadFlow |
| :--- | :--- | :--- |
| Suscripción / pase diario | Cobra tiempo no usado | Cobro exacto por segundo de uso |
| Seña / anticipo informal | Sin garantía para nadie | 100% depositado y liberado por etapas |
| Escrow bancario / notarial | 2–5% de costo, lento, opaco | Automático, auditable, casi sin costo |
| Billeteras virtuales | Solo transfieren; no entienden "uso" ni "etapas" | Lógica de consumo y garantía nativa |

**Notas del orador:** Nadie combina las dos cosas: cobro por consumo real + custodia fraccionada garantizada, en una sola cuenta con experiencia Web2. Las billeteras mueven plata; nosotros movemos plata *con lógica de negocio*.

---

## Slide 8 — Por qué Monad (moat técnico)

**Título:** Esto solo corre sobre Monad

**Texto en pantalla:**
- Cobrar segundo a segundo exige **10.000 TPS** y **finalidad de 1 segundo**.
- **EVM paralelo:** miles de check-ins simultáneos en cientos de comercios sin congestión.
- **Costos ínfimos:** el streaming de micropagos es viable — en otras redes la comisión supera lo cobrado.
- Account abstraction: toda la complejidad de la blockchain queda invisible para el usuario.

**Notas del orador:** No es "elegimos Monad entre varias": el producto *no existe* sin Monad. Micropagos por segundo con miles de usuarios concurrentes es exactamente lo que la ejecución en paralelo habilita.

---

## Slide 9 — Producto y roadmap

**Título:** De hackathon a producto

**Texto en pantalla:**
- Hoy: MVP funcional — los dos modos, login con Google, saldo en pesos y dólares, cero fricción.
- Próximo: rampa real ARS/USD vía Mercado Pago y CVU.
- Futuro: agente orquestador — resolución automática de disputas y operación delegada por el usuario.

**Notas del orador:** Los acuerdos ya prevén un árbitro opcional por proyecto: el camino a un agente de IA que resuelva disputas está diseñado desde la arquitectura.

---

## Slide 10 — Cierre

**Título:** MonadFlow

**Texto en pantalla:**
- *La infraestructura de pagos del consumo real.*
- Pagás por lo que usás. Tu plata siempre está protegida.
- Construido sobre Monad.

**Notas del orador:** Cerrar con la frase del tagline y agradecer. Dejar el tagline en pantalla durante el Q&A.

---

## 📎 Anexo — Material de apoyo para el orador (no va a slides)

### Pilares de valor
1. **Precisión** — pagás exactamente lo que consumís.
2. **Protección** — el 100% del acuerdo garantizado antes de empezar.
3. **Simplicidad** — experiencia Web2 total, en pesos o dólares.

### Objeciones previsibles del jurado
- *"¿Y si el cliente no aprueba la etapa?"* → Auto-aprobación por temporizador configurable.
- *"¿Y si hay disputa real?"* → Árbitro opcional por proyecto; hoy humano, mañana el agente orquestador.
- *"¿Cómo entra la plata?"* → Ingreso en pesos o dólares; conversión dentro de la app; retiro vía CVU (rampa en roadmap).
- *"¿Por qué no Mercado Pago?"* → MP transfiere saldos; no tiene cobro por consumo en vivo ni custodia liberada por hitos.

---

## ✅ Pendientes

- [ ] Validar con PM (Agente 01) orden de slides y cifras (10.000 TPS, 2–5% escrow).
- [ ] Confirmar con Agente 05 qué capturas de la demo ilustran slides 4 y 5.
- [ ] Unificar con `PITCH_GUION.md`: que el guion hablado siga este orden de slides.

## 🔗 Archivos Relacionados
- [Guion del pitch](PITCH_GUION.md)
- [Contexto Maestro](../00_System/CONTEXTO_MAESTRO.md)
- [Reglas UX Invisible](../00_System/Skills/web3_invisible_ux_rules.md)
- [Perfil Market Strategy](../00_System/Agents/07_Market_Strategy_Agent.md)
