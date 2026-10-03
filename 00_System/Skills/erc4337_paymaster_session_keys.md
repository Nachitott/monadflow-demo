# Skill: ERC-4337, Paymasters & Session Keys

## Reglas de Implementación
- **Gasless User Experience (Paymaster):**
  - Toda transacción iniciada por el usuario en la PWA debe pasar por un Paymaster patrocinado ($0 gas percibido por el usuario).
- **Session Keys (Firmas Silenciosas):**
  - Configurar claves de sesión temporales con permisos acotados (ej. únicamente llamar a `startStream` y `stopStream` con un límite máximo de gasto).
  - Evitar solicitudes de firma pop-up repetitivas durante la navegación del usuario.
- **Fallbacks:**
  - Si el bundler de ERC-4337 presenta latencia, mostrar un spinner de estado con terminología amigable (*"Procesando pago seguro..."*) en lugar de errores técnicos.

## Archivos Relacionados
- [[web3_invisible_ux_rules]]
- [[03_Frontend_UX_Engineer_Agent]]
- [[04_Fiat_Integrations_Agent]]