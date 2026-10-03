# PITCH_GUION — MonadFlow (Boceto v0.1)

> **Estado:** primer boceto de trabajo. Copropiedad del Agente 07 (Market Strategy — narrativa) y el Agente 01 (PM — alineación de producto). Iterar sobre este archivo, no crear copias.
>
> **Restricción dura:** video demo de **3 minutos máximo** ([checklist](../00_System/Skills/hackathon_submission_checklist.md)). El guion está pensado para ~2:45 dejando margen.
>
> **Regla de copy:** en pantalla y en el guion hablado, cero jerga cripto ("wallet", "gas", "USDC", "smart contract"). **Sí se puede y se debe nombrar Monad y blockchain** — el jurado evalúa el track sobre Monad.

---

## 🎣 Tagline (candidato, a refinar)

> **"Pagás por lo que usás. Tu plata, protegida por etapas."**

Alternativas para discutir:
- "El dinero que se mueve a la velocidad de tu consumo."
- "Ni un peso de más, ni un trabajo sin cobrar."

## 🗣️ One-liner

> MonadFlow es la plataforma de pagos en tiempo real donde el cliente paga **segundo a segundo por lo que consume** y el dinero de un acuerdo queda **100% protegido y liberado por etapas** — con una experiencia tan simple como Mercado Pago, en pesos o en dólares.

---

## 🎬 Estructura del guion (≈2:45)

### 1. El problema (0:00 – 0:30)

> *"Dos situaciones que todos conocemos:*
> *Pagás un mes de gimnasio y vas tres veces. El coworking te cobra el día entero aunque te quedaste dos horas. El dinero no se mueve al ritmo del consumo real.*
> *Y del otro lado: le encargás un trabajo a un freelancer o a un contratista y la plata queda en el aire — el cliente teme pagar por adelantado y no recibir nada, y el trabajador teme trabajar gratis. Hoy eso se resuelve con señas informales o escrows bancarios que cobran entre 2% y 5%."*

**Idea clave:** pagar de más por un lado, arriesgar la plata por el otro.

### 2. La solución (0:30 – 1:00)

> *"MonadFlow resuelve los dos problemas con una sola cuenta:*
> ***Modo 1 — Pago por uso:** escaneás un QR al entrar y tu saldo se descuenta en tiempo real, solo por el tiempo o consumo efectivo. Podés fijar un tope máximo de gasto y el comercio ve todo en vivo desde su panel.*
> ***Modo 2 — Dinero protegido por etapas:** antes de empezar un trabajo, el cliente deposita el 100% del acuerdo en un fondo de garantía protegido. El dinero se libera etapa por etapa, con un clic, y si cancelás te devuelven todo lo que aún no se aprobó."*

### 3. Demo (1:00 – 2:00) — a definir con Agente 05

Secuencia tentativa (ajustar a lo que esté funcionando):
1. **Modo 1:** login con Google → ingreso de saldo en ARS → escaneo QR → contador de saldo corriendo en vivo → tope de gasto → check-out con comprobante.
2. **Modo 2:** crear acuerdo con 3 etapas → depósito del 100% → entrega de etapa → aprobación en 1 clic → liberación de fondos.

> *"Todo esto sin instalar nada, sin frases semilla, sin comisiones de red: el usuario solo ve su cuenta, sus pesos o sus dólares."*

### 4. Por qué Monad (2:00 – 2:30)

> *"Esto solo es posible sobre Monad. Cobrar segundo a segundo exige 10.000 transacciones por segundo y finalidad de 1 segundo — en cualquier otra red, el streaming de micropagos se congestiona o cuesta más en comisiones que lo que se cobra.*
> *Gracias a la ejecución en paralelo del EVM de Monad, miles de clientes pueden hacer check-in simultáneo en cientos de comercios sin cuellos de botella. Y con account abstraction, toda la complejidad de la blockchain queda invisible para el usuario."*

### 5. Cierre (2:30 – 2:45)

> *"MonadFlow: la infraestructura de pagos del consumo real — pagás por lo que usás, y tu plata siempre está protegida. Construido sobre Monad."*

---

## 🧱 Pilares de valor (para slides / Q&A)

1. **Precisión:** pagás exactamente lo que consumís — ni un peso de más.
2. **Protección:** el 100% del dinero del acuerdo queda garantizado antes de empezar; nadie trabaja ni paga a ciegas.
3. **Simplicidad:** experiencia Web2 total — login con Google, saldo en pesos o dólares, cero fricción cripto.

## 👤 Buyer personas (resumen para argumentar en Q&A)

- **Consumidor:** usuarios urbanos AR/ES de servicios por tiempo (gimnasio, coworking, parking) que pagan suscripciones que no aprovechan.
- **Comercio:** gimnasios, coworkings, salas de ensayo que quieren monetizar el uso real sin fricción ni punto de venta costoso.
- **Trabajador independiente:** freelancers y contratistas que necesitan certeza de cobro antes de arrancar.
- **Contratante:** personas/empresas que hoy desconfían de pagar anticipos sin garantía.

## ⚔️ Diferenciadores frente a alternativas (argumentario Q&A)

| Alternativa | Su límite | Ventaja MonadFlow |
| :--- | :--- | :--- |
| Suscripción / pase diario | Cobra tiempo no usado | Cobro exacto por segundo de uso |
| Seña o anticipo informal | Sin garantía para ninguna parte | 100% depositado y liberado por etapas |
| Escrow bancario / notarial | 2–5% de costo, lento, opaco | Automático, auditable, casi sin costo |
| Billeteras virtuales (MP, etc.) | Solo transferencia; no conocen "uso" ni "etapas" | Lógica de consumo y garantía nativa |

---

## ✅ Pendientes para iterar

- [ ] Validar tagline y one-liner con PM.
- [ ] Confirmar duración exacta y formato del pitch según reglamento Metropolis.
- [ ] Definir con Agente 05 qué flujos reales se muestran en la demo (depende del estado del MVP).
- [ ] Crear `01_Architecture/MARKET_STRATEGY.md` con investigación de mercado completa.
- [ ] Adaptar este guion a versión escrita (submission) y versión hablada (video).

## 🔗 Archivos Relacionados
- [Contexto Maestro](../00_System/CONTEXTO_MAESTRO.md)
- [Reglas UX Invisible](../00_System/Skills/web3_invisible_ux_rules.md)
- [Checklist Hackathon](../00_System/Skills/hackathon_submission_checklist.md)
- [Perfil Market Strategy](../00_System/Agents/07_Market_Strategy_Agent.md)
- [Perfil Product Manager](../00_System/Agents/01_Product_Manager_Agent.md)
- [Perfil QA & Demo](../00_System/Agents/05_QA_Testing_Demo_Director_Agent.md)
