# TASK BACKLOG: Frontend (Next.js + Tailwind CSS + Viem/Wagmi)

## 🎯 Prioridad y Estado General
- [x] Fase 1: Setup del Proyecto, Web3 Core (Privy/Wagmi) y UI Base
- [x] Fase 2: Autenticación Invisible y Widget Simulador Fiat (ARS/USD)
- [ ] Fase 3: UI/UX Modo 1 (Pay-per-use Stream & Live Dashboard)
- [ ] Fase 4: UI/UX Modo 2 (Milestone-Lock Escrow & Contrataciones)
- [ ] Fase 5: Conexión con Smart Contracts y Animaciones en Tiempo Real

---

## 📱 Fase 1: Setup & Web3 Invisible ✅
- [x] **Configuración de Proyecto:**
  - Inicializar Next.js (App Router), Tailwind CSS y Lucide Icons. → `03_Frontend_Terminal/app/` (Next 14 + TS + Tailwind).
  - Configurar proveedor RPC de Monad Testnet en Viem / Wagmi → `src/lib/chains.ts` + `src/lib/wagmi.ts` (chain 10143).
- [x] **Autenticación Invisible (Privy / Web3Auth):**
  - Implementar flujo de Login Social (Google, Apple, Email; passkey disponible vía Privy en runtime) omitiendo modales tradicionales de conexión de billeteras → `LoginScreen.tsx`, `providers.tsx`.
  - Ocultar la dirección pública (0x...) bajo un perfil de usuario (Email / Nombre) → `HeaderUserBar.tsx` muestra nombre/email, nunca la dirección.
- [x] **Session Keys & Paymaster (ERC-4337):**
  - Configurar abstraído de gas para que toda transacción sea $0 de costo percibido para el usuario → `src/lib/aa.ts` (EntryPoint v0.6 + bundler/paymaster por env).
  - Habilitar claves de sesión para firmas silenciosas durante el inicio/cierre de consumo → política de session key (24h) definida en `aa.ts`; integración efectiva pendiente de ABIs (Fase 5).

---

## 💵 Fase 2: Visualización Multimoneda & Simulación Fiat (ARS/USD) ✅
- [x] **Ticker en Tiempo Real:**
  - Selector para alternar visualización entre ARS ($) y USD → integrado en `BalanceCard.tsx`.
  - Hook `useExchangeRate` → `src/lib/useExchangeRate.ts` (cotización simulada, refresco c/30s, conversión ARS↔USD, `formatAmount` es-AR).
- [x] **Modal Simulador Mercado Pago / CVU:**
  - Formulario desplegable para ingresar Pesos Argentinos (ARS) o USD → `FiatRampModal.tsx` (montos rápidos, alias `monadflow.mp`).
  - Botón "Cargar Saldo" con animación de procesamiento instantáneo que acrecienta el balance → acreditación optimista en 1.2s, doble saldo ARS/USD en `page.tsx`.

---

## ⏱️ Fase 3: Modo 1 (Pay-per-use Stream)
- [ ] **Vista Cliente (Consumidor):**
  - Componente Escáner QR / Lectura de enlace de comercio.
  - Formulario de ajuste de límite máximo (`Auto-cap`) en ARS/USD antes de iniciar.
  - Pantalla de sesión activa con contador dinámico en vivo (usando GSAP o Anime.js) que incrementa segundos y monto acumulado en tiempo real.
  - Botón "Finalizar Consumo" con confirmación instantánea en 1-clic.
- [ ] **Vista Comercio (Live Merchant Dashboard):**
  - Grilla responsiva con tarjetas de clientes activos, minutos transcurridos y gasto parcial.
  - Controles de frecuencia de actualización (1m, 5m, 15m, Manual 🔄).
  - Botón de **Killswitch**: Desactiva visualmente la recepción de nuevos clientes via QR.
  - Modal exportable de "Reporte de Cierre Diario" (Resumen de ingresos totales y clientes atendidos).

---

## 📝 Fase 4: Modo 2 (Milestone-Lock Escrow)
- [ ] **Creador de Contrato (Contratista):**
  - Formulario paso a paso: Título, Monto Total, Cantidad de Etapas, Moneda (ARS/USD) y Días para Auto-Aprobación.
  - Desglose interactivo con vista previa del monto por cada hito.
  - Generación instantánea de enlace y código QR de cobro para enviar al cliente.
- [ ] **Vista Cliente / Aprobador:**
  - Tarjeta de estado de custodia: Muestra con indicador visual que el **100% del depósito está congelado y garantizado** en el contrato inteligente.
  - Lista de etapas/hitos con badges de estado (`Pendiente`, `En Proceso`, `Completado`).
  - Botón "Aprobar Etapa" (1-clic) para liberar los fondos de esa fracción.
  - Botón "Cancelar Proyecto": Modal con desglose de reembolso del 100% sobre los fondos congelados no aprobados.

---

## 🎨 Fase 5: Componentes de Interfaz & Pulido Visual
- [ ] Aplicar diseño Mobile-First enfocado en usabilidad en smartphones.
- [ ] Sanitización estricta de textos: Garantizar cero uso de términos como "Gas", "Hex", "Hash", "USDC" o "Wallet" en la interfaz.
- [ ] Pruebas de integración con los ABIs reales generados en `02_SmartContracts_Terminal/ABIs/`.