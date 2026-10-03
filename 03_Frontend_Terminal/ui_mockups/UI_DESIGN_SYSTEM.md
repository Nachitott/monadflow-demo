# UI DESIGN SYSTEM & STYLING GUIDELINES

Pautas estéticas y de diseño para la maquetación en Next.js y Tailwind CSS.

---

## 🎨 1. Paleta de Colores (Tailwind Tokens)

* **Fondo / Canvas:** Dark Mode Slate (`bg-slate-950` / `bg-slate-900`) para una estética financiera moderna.
* **Marca Principal (Monad Vibe):** Violeta / Púrpura Neón (`indigo-600` / `purple-500`).
* **Modo 1 - Streaming por Tiempo:** 
  * Activo / Contador: Verde Esmeralda (`emerald-400` / `teal-500`).
  * Alerta de Cap: Ámbar / Naranja (`amber-400`).
* **Modo 2 - Custodia por Hitos:** 
  * Fondos Congelados / Garantía: Azul Cyan (`cyan-400` / `sky-500`).
  * Estado Completado: Esmeralda (`emerald-500`).
* **Acciones Críticas / Killswitch:** Rojo Carmesí (`rose-600` / `red-500`).

---

## ✍️ 2. Tipografía & Componentes

* **Fuente Principal:** Sans-Serif limpia (`Inter` / `Geist Sans`).
* **Moneda / Números Dinámicos:** Fuente Monoespaciada (`font-mono`) para evitar saltos de ancho al actualizar segundos o saldo en tiempo real.
* **Iconografía (Lucide-React):**
  * `QrCode` (Escaneo de comercio)
  * `Timer` / `Clock` (Contador de streaming)
  * `ShieldCheck` / `Lock` (Garantía de custodia congelada)
  * `RefreshCw` (Refresco de dashboard)
  * `Power` (Killswitch de emergencia)
  * `ArrowUpRight` / `ArrowDownLeft` (Carga y retiro Fiat)

---

## 🚫 3. Regla de Oro UX Invisible
Queda estrictamente prohibido renderizar en pantalla:
1. Hashes de transacción de 64 caracteres.
2. Nombres de red (Ej. "Monad Testnet" o "Chain ID").
3. Modales pidiendo "Confirmar Gas" o "Aprobar Token ERC-20".
4. Términos técnicos como "Smart Contract", "USDC", "Wallet Address" o "Paymaster".

---
## 🔗 Flujos de Pantalla Relacionados
- Para ver la aplicación de estas reglas en las pantallas de la app, consultar [[WIREFRAMES_FLOW]].
- Volver al [[CONTEXTO_MAESTRO]].