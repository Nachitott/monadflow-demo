# Configuración de Red: Monad Testnet / Devnet

Este documento consolida la configuración de parámetros técnicos de la red de **Monad** requerida para conectar Foundry, Viem/Wagmi y los Paymasters de Account Abstraction.

---

## 🌐 1. Parámetros Principales de la Red

| Parámetro | Valor |
| :--- | :--- |
| **Nombre de la Red** | Monad Testnet |
| **Chain ID (Decimal)** | `10143` |
| **Chain ID (Hex)** | `0x279F` |
| **RPC URL Pública** | `https://testnet-rpc.monad.xyz` |
| **Símbolo Nativo** | `MON` (18 decimales) |
| **Block Explorer** | [https://testnet.monadexplorer.com](https://testnet.monadexplorer.com) |
| **Faucet de MON** | [https://faucet.monad.xyz](https://faucet.monad.xyz) |

---

## ⚡ 2. Configuración de Account Abstraction (ERC-4337)

Para habilitar la experiencia de **Cadena de Bloques Invisible** (transacciones gasless y firmas con Session Keys):

* **EntryPoint Contract (v0.6):** `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`
* **Bundler Endpoint:** `https://bundler.monad.xyz` (o proveedor Biconomy / ZeroDev)
* **Paymaster Endpoint:** `https://paymaster.monad.xyz`

---

## ⚙️ 3. Configuración para Herramientas de Desarrollo

### A. Foundry (`foundry.toml`)
```toml
[profile.default]
src = 'src'
out = 'out'
libs = ['lib']
eth_rpc_url = "https://testnet-rpc.monad.xyz"
chain_id = 10143

[rpc_endpoints]
monad_testnet = "https://testnet-rpc.monad.xyz"
```

### B. Wagmi / Viem (Next.js Config)
```typescript
import { defineChain } from 'viem';

export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadExplorer', url: 'https://testnet.monadexplorer.com' },
  },
});
```

### C. Variables de Entorno Recomendadas (`.env.local`)
```bash
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_RPC_URL="https://testnet-rpc.monad.xyz"
NEXT_PUBLIC_MONAD_EXPLORER_URL="https://testnet.monadexplorer.com"
NEXT_PUBLIC_PRIVY_APP_ID="your_privy_app_id"
PAYMASTER_API_KEY="your_paymaster_key"
PRIVATE_KEY="your_deployer_private_key"
```

---

## 🔗 Archivos Relacionados (Obsidian Graph)
- [Contexto Maestro](../00_System/CONTEXTO_MAESTRO.md)
- [Reglas de Agentes](../00_System/REGLAS_AGENTES.md)
- [Direcciones de Contratos](Contract_Addresses.md)
- [Modelado de Smart Contracts](../01_Architecture/Modelado_SmartContracts.md)
- [Integración Frontend](../01_Architecture/Integracion_Frontend.md)
- [Perfil Smart Contracts Engineer](../00_System/Agents/02_Smart_Contracts_Engineer_Agent.md)
- [Perfil Frontend UX Engineer](../00_System/Agents/03_Frontend_UX_Engineer_Agent.md)
- [Guía Monad EVM](../00_System/Skills/monad_parallel_evm_guide.md)
