# SPECS: Componentes Transversales y Globales

Especificaciones técnicas para componentes comunes reutilizables en toda la aplicación.

---

## 💳 1. BalanceCard (`BalanceCard.tsx`)
Muestra el saldo global del usuario con selector de divisa instantáneo sin parpadeos visuales.

* **Props:**
  * `balanceARS` (`number`): Saldo disponible en Pesos Argentinos.
  * `balanceUSD` (`number`): Saldo equivalente en Dólares Digitales.
  * `activeCurrency` (`'ARS' | 'USD'`): Divisa seleccionada.
  * `onCurrencyToggle` (`(currency: 'ARS' | 'USD') => void`): Callback para alternar moneda.
* **Estados Internos:** Ninguno (Componente controlado).
* **Reglas UX & Estilo:**
  * Usar fuente monoespaciada (`font-mono`) en los montos para evitar saltos de layout al alternar.
  * **Prohibido:** Mostrar decimales en `wei` o sufijos como `USDC` / `ETH`.

---

## 🏦 2. FiatRampModal (`FiatRampModal.tsx`)
Modal de simulación para carga rápida de saldo desde cuentas bancarias o billeteras virtuales.

* **Props:**
  * `isOpen` (`boolean`): Control de visibilidad del modal.
  * `onClose` (`() => void`): Callback de cierre.
  * `onDepositSuccess` (`(amount: number, currency: 'ARS' | 'USD') => void`): Callback ejecutado al confirmar el depósito.
* **Estados Internos:**
  * `amountInput` (`string`): Valor tipeado por el usuario.
  * `isProcessing` (`boolean`): Estado de carga durante la simulación de transferencia.
* **Comportamiento:**
  * Renderiza opciones visuales simuladas ("Alias / CVU Mercado Pago").
  * Al hacer clic en "Confirmar Carga", simula una latencia de 1.2s y actualiza el saldo de forma optimista.

---

## 👤 3. HeaderUserBar (`HeaderUserBar.tsx`)
Barra superior con información de perfil y estado de conexión silenciosa.

* **Props:**
  * `userName` (`string`): Nombre o alias del usuario (obtenido vía Social Login / Passkey).
  * `userAvatar` (`string`): URL del avatar o iniciales.
  * `isConnected` (`boolean`): Estado de la sesión.
* **Comportamiento:**
  * Muestra badge de conexión limpia ("Conectado con Passkey / Google").
  * Sin mostrar hashes de clave pública ni direcciones hexadecimales de 40 caracteres.

---

## 🔗 Enlaces y Relaciones
- Guía visual y colores: [[UI_DESIGN_SYSTEM]]
- Mapa de navegación: [[WIREFRAMES_FLOW]]
- Componentes de Streaming: [[MODE1_STREAMING_COMPONENTS]]
- Componentes de Custodia: [[MODE2_ESCROW_COMPONENTS]]