# WIREFRAMES & USER FLOWS (MonadFlow)

Este documento describe los flujos de navegación y la distribución de pantallas para la aplicación móvil/PWA.

---

## 📱 1. Onboarding & Web3 Invisible
* **Pantalla 1: Landing / Login Social**
  * Botón destacado: "Continuar con Google" / "Passkeys".
  * Sin referencias a wallets, gas o Web3.
* **Pantalla 2: Dashboard Principal**
  * Saldo destacado en ARS / USD con botón Ticker para alternar moneda.
  * Botón flotante: "Cargar Pesos" (Abre modal simulador Mercado Pago / CVU).
  * Acceso directo a dos pestañas principales: **Modo Consumo (QR)** y **Modo Proyectos (Hitos)**.

---

## ⏱️ 2. MODO 1: Pay-per-use Stream (Streaming por Tiempo)

### Vista Cliente (Consumidor)
1. **Paso 1 (Escaneo):** Lector de código QR o apertura vía enlace dinámico del comercio.
2. **Paso 2 (Ajuste de Límite):** Formulario para definir el tope máximo (`Auto-cap`) en ARS/USD antes de iniciar.
3. **Paso 3 (Sesión Activa):** 
   * Contador de tiempo transcurrido corriendo segundo a segundo (GSAP / Anime.js).
   * Indicador visual del gasto acumulado en tiempo real.
   * Botón destacado de 1-clic: "Finalizar Consumo".
4. **Paso 4 (Resumen):** Pantalla de confirmación con el desglose del total cobrado y devolución del saldo no consumido.

### Vista Comercio (Live Merchant Dashboard)
1. **Panel Principal:** Grilla responsiva de clientes actualmente conectados en el establecimiento.
2. **Selector de Refresco:** Botones para cambiar la frecuencia de actualización (1m, 5m, 15m, Manual 🔄).
3. **Control de Emergencia:** Botón rojo de **Killswitch** para desactivar la recepción de nuevos check-ins vía QR.
4. **Cierre de Jornada:** Modal exportable de "Reporte Diario" con métricas de facturación total.

---

## 📝 3. MODO 2: Milestone-Lock Escrow (Custodia por Hitos)

### Vista Contratista (Creador)
1. **Formulario de Proyecto:** Título, Monto Total, Moneda (ARS/USD), Número de etapas y Días de Auto-Aprobación.
2. **Generador de Enlace:** Emisión instantánea de QR/Link de cobro garantizado para enviar al cliente.

### Vista Cliente (Aprobador)
1. **Dashboard de Custodia:** Banner con badge visual resaltando: *"100% de los fondos congelados en garantía"*.
2. **Lista de Hitos:** Indicadores de estado (`Pendiente`, `En Proceso`, `Completado`).
3. **Acciones de Control:**
   * **Aprobar Etapa (1-Clic):** Libera los fondos del hito actual al contratista y habilita la siguiente fase.
   * **Cancelar Proyecto:** Modal que calcula y ejecuta la devolución inmediata del 100% de los fondos de etapas no aprobadas.
---
## 🔗 Guía de Estilos Relacionada
- Para la paleta de colores, fuentes e iconografía de estos flujos, consultar [[UI_DESIGN_SYSTEM]].
- Volver al [[TASK_BACKLOG]] del Frontend.