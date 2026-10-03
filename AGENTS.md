# AGENTS.md — MonadFlow

Hackathon **Monad Metropolis Global**, track *Consumer Products & Payments*.
Producto: pagos en tiempo real por uso de servicio + acuerdos con dinero 100% protegido por etapas, con experiencia Web2 y operando en pesos argentinos o dólares.

**Antes de tocar nada, leé `00_System/CONTEXTO_MAESTRO.md`.** Es la fuente de verdad del producto y del "por qué Monad".

---

## 1. Forma del repo

Repo **doc-first**. Los directorios numerados son notas de un vault Obsidian, enlazadas entre sí con `[[wikilinks]]`. **No son código y no compilan.**

| Ruta | Qué es |
| :--- | :--- |
| `00_System/` | Contexto maestro, reglas de agentes, perfiles, skills, bitácoras |
| `01_Architecture/` | Specs de arquitectura + diagramas (`images/`) |
| `02_SmartContracts_Terminal/` | **Solo un backlog. No hay código Solidity.** |
| `03_Frontend_Terminal/app/` | **La app.** Único proyecto Next.js con dependencias |
| `03_Frontend_Terminal/{components_specs,ui_mockups}/` | Specs de componentes y design system |
| `04_Deploy_and_Networks/` | Parámetros de red y direcciones de contratos |
| `05_PostMortem_and_Networks/` | **Vacía** |
| `06_Agent_Orchestrator/` | Spec del orquestador (futuro, no implementado) |
| `07_Landing/` | **Landing de venta. Proyecto independiente.** |

No hay `package.json` raíz, ni workspaces, ni turbo, ni monorepo tooling. **Todo comando corre dentro del proyecto que corresponda.**

## 2. Los dos proyectos de código

Son **independientes por diseño**: package.json, `node_modules`, build y deploy separados. La landing **no importa nada** de la app y viceversa. No los fusiones, no los linkees, no muevas archivos de uno al otro salvo pedido explícito.

| | `03_Frontend_Terminal/app` | `07_Landing/` |
| :--- | :--- | :--- |
| Qué es | La app de producto (login, Privy, wagmi) | Página de venta estática |
| Puerto dev | `3000` | `3001` |
| Stack | Next 14 App Router + Tailwind + Privy + wagmi + viem | Next 14 App Router + Tailwind + lucide |
| Render | Dinámico (`force-dynamic`) | Estático (`output: 'export'` → `out/`) |
| Deps | 106+ pkgs, capa Web3 pesada | 106 pkgs, **cero** web3 |

La landing no tiene Privy, ni wagmi, ni viem, ni `.env`. Si necesitás.web3 en la landing, es una señal de que algo se está mezclando.

## 3. Comandos

**App** — `cd 03_Frontend_Terminal/app`

```bash
npm run dev      # next dev en :3000
npm run build    # único check de tipos real del repo
```

**Landing** — `cd 07_Landing`

```bash
npm run dev      # next dev en :3001 (puerto fijo, para no chocar con la app)
npm run build    # genera out/ (HTML/CSS/JS estático)
npm run typecheck # tsc --noEmit
```

### Comandos que NO existen (los docs los mencionan igual)

- **No hay tests.** Ni script `test` ni runner configurado. `REGLAS_AGENTES.md` §3 exige "tests al 100%" pero no hay forma de correrlos.
- **No hay Foundry.** Ni `forge`, ni `foundry.toml`, ni archivos `.sol`. Los comandos `forge build` / `forge test` del Definition of Done no son ejecutables hoy.
- **`npm run lint` cuelga.** En ambos proyectos `next lint` no tiene config de ESLint, así que abre el wizard interactivo *"How would you like to configure ESLint?"* y queda esperando input. **No lo corras en modo no interactivo.** Para verificar cambios usá `npm run build` (app) o `npm run typecheck` (landing).

**Orden de verificación:** `typecheck/build` primero, después levantá el dev server. No hay lint ni tests que valgan como paso previo.

## 4. Docs ≠ código

Los docs están adelantados al código. **Verificá contra el código antes de prometer algo.**

| Los docs dicen | La realidad |
| :--- | :--- |
| 5 contratos Solidity (`TimeStream`, `MilestoneEscrow`, `MockUSDC`, `MockARS`, `MockExchange`) | **Cero `.sol`.** `02_SmartContracts_Terminal/` solo tiene `TASK_BACKLOG.md` |
| Rutas `/dashboard`, `/scan`, `/stream/[id]`, `/merchant`, `/milestones/*` | **Solo existe `/`** en la app |
| Hooks `useDualWallet`, `useConversion`, `useMonadStream`, `useMilestoneEscrow`, `useFiatRamp` | **`src/hooks/` no existe** |
| Session keys + paymaster activos | `src/lib/aa.ts` son **constantes de config**, no conectadas a ninguna transacción |
| Stack con "Framer Motion" | **No está instalado** en la app |
| `02_SmartContracts_Terminal/ABIs/` | No existe; el frontend no tiene ABIs |
| `05_PostMortem_and_Networks/` como destino de logs | Está **vacía** (ver §7) |

La app real son 5 archivos: `src/app/{layout,page,providers}.tsx`, `src/components/{HeaderUserBar,LoginScreen}.tsx`, más `src/lib/{aa,chains,wagmi}.ts`. Todo lo demás es plan.

## 5. Regla de Oro: Web3 invisible

Es la restricción de producto **más fácil de violar por omisión**. En toda pantalla de producto nunca se renderiza:

| Prohibido | Usar en su lugar |
| :--- | :--- |
| `wallet`, `billetera` | `Cuenta MonadFlow`, `Mi perfil` |
| `gas`, `fee`, comisión de red | *(no existe — todo es patrocinado)* |
| `USDC`, `token`, `stablecoin` | `Dólares (USD)`, `Pesos (ARS)` |
| `smart contract`, `escrow` | `Fondo de garantía protegido`, `Acuerdo` |
| `hash`, `tx id` | `Comprobante #ID`, `Código de operación` |
| `paymaster`, `chain id`, nombre de red | *(no se muestra)* |

Además: nunca muestres direcciones `0x...`, nunca selectores de gas, nunca "Confirmar en Metamask". Errores de red se muestran como *"No se pudo procesar la solicitud, intentá nuevamente"*.

**Alcance:** la regla aplica a la **app**. En la **landing** (`07_Landing/`) la jerga técnica también está prohibida en el copy de venta, **pero se puede nombrar Monad y blockchain** — el jurado de Metropolis evalúa que el proyecto esté sobre Monad. Al agregar copy, pasalo por la lista de arriba igual.

Detalle en `00_System/Skills/web3_invisible_ux_rules.md`.

## 6. Design system

Tokens en `03_Frontend_Terminal/ui_mockups/UI_DESIGN_SYSTEM.md`. Ojo: **`tailwind.config.ts` tiene `theme.extend` vacío** en ambos proyectos — no hay tokens custom, usá **clases stock de Tailwind**.

- Fondo: `bg-slate-950` / `bg-slate-900`, modo oscuro siempre (`color-scheme: dark`)
- Marca: `indigo-600` / `purple-500`
- Modo 1 (pago por uso): `emerald-400` / `teal-500`; alerta de tope: `amber-400`
- Modo 2 (etapas): `cyan-400` / `sky-500`; completado: `emerald-500`
- Killswitch / crítico: `rose-600` / `red-500`
- Tipografía: **Inter** vía `next/font` (ya configurado en el `layout.tsx` de cada proyecto)
- **Números que cambian en vivo → `font-mono` + `tabular-nums`**, para que no salten de ancho

## 7. Convenciones

- **Todo el copy en español rioplatense** (es-AR), voseo. `<html lang="es-AR">` en la landing, `lang="es"` en la app.
- **Moneda dual**: los montos se expresan en ARS o USD y el usuario elige. Formato argentino (`$ 84.300`).
- **Registrá cada sesión** en `00_System/Agents_Logs/<Agente>/{Work_Journal,Error_Index}.md` (`REGLAS_AGENTES.md` §4). Es el destino real de los logs: `.devin/instructions.md` apunta a `05_PostMortem_and_Networks/`, que está vacía y sin formato — no la uses.
- Actualizá los checkboxes de `TASK_BACKLOG.md` al cerrar una fase.
- Actualizá `04_Deploy_and_Networks/Contract_Addresses.md` cuando haya un deploy real (hoy todo está "Pendiente").

## 8. Red

Monad Testnet — chain ID **10143**, RPC `https://testnet-rpc.monad.xyz`, explorer `https://testnet.monadexplorer.com`, EntryPoint v0.6 `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`, bundler `https://bundler.monad.xyz`, paymaster `https://paymaster.monad.xyz`.

Vars de la app (`.env.local`): `NEXT_PUBLIC_MONAD_CHAIN_ID`, `NEXT_PUBLIC_MONAD_RPC_URL`, `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_BUNDLER_URL`, `NEXT_PUBLIC_PAYMASTER_URL`. Hay un `.env.example` con las mismas claves.

Detalle completo en `04_Deploy_and_Networks/Monad_Testnet_Config.md`.

## 9. Gotchas

- **No hay git.** No es un repo versionado y no hay `.gitignore` en la raíz. Si lo inicializás, agregá `.gitignore` **antes** del primer commit: hay `.next/`, `node_modules/` y un `.env.local` con un **Privy App ID real** expuestos en el árbol.
- **`03_Frontend_Terminal/app/.next/`** contiene artefactos de build viejos, commiteados en el árbol. No los edites a mano; regeneralos con `npm run build`.
- Hay un archivo `nul` suelto en la raíz (basura de un comando de Windows mal corrido). Se puede borrar.
- **Ambos proyectos usan `next@14.2.15`, que npm marca como vulnerable** (security advisory de dic-2025). Si vas a exponer la landing públicamente, subí la versión en los dos proyectos.
- `layout.tsx` de la app tiene `export const dynamic = 'force-dynamic'` a nivel raíz: afecta a **todas** las rutas de la app. No lo saques pensando en la landing — la landing es otro proyecto y ya exporta estático.