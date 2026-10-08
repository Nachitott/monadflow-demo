# Bocetos Excalidraw — Inbox del Agente 08 (UX Designer)

Depósito de bocetos de referencia que el equipo dibuja en [Excalidraw](https://excalidraw.com). El Agente 08 los usa como fuente de verdad visual para producir specs.

## Convención de archivos

Guardar **los dos formatos** por boceto:

```
sketches/
├── <pantalla>_<fecha>.excalidraw     # fuente editable (ej: enviar_p2p_2026-10-07.excalidraw)
├── <pantalla>_<fecha>.png            # export visual (que el agente pueda leer)
└── <pantalla>_<fecha>.svg            # opcional, vectorial
```

* Nombre en `snake_case`, empezando por la pantalla/flujo (`enviar_p2p`, `dashboard_saldos`, `onboarding_login`).
* Si hay varias versiones, el más reciente por fecha gana; versiones viejas quedan como historial.
* El PNG es **obligatorio** — es el que el agente lee visualmente. El `.excalidraw` queda para iterar el boceto.

## Registro de bocetos

| Archivo | Pantalla/Flujo | Estado | Spec derivada |
| :--- | :--- | :--- | :--- |
| `../MonadFlow_Inicio.png` | Home / Inicio post-login | ✅ Implementado (2026-10-07) | `WIREFRAMES_FLOW.md` §1 Pantalla 2 + `components_specs/COMMON_COMPONENTS.md` (BottomNav, ActivityList, BalanceCard) |

> Nota: `MonadFlow_Inicio.png` quedó en la raíz de `ui_mockups/` en vez de `sketches/`; se registra acá igual para no perder trazabilidad.

## Notas para quien dibuja

- No hace falta pixel-perfect: el boceto define **layout, jerarquía y flujo**, no diseño final.
- Anotar dentro del canvas textos de copy tentativos — el agente los pulirá a es-AR sin jerga cripto.
- Si el boceto contradice el design system (`UI_DESIGN_SYSTEM.md`), el agente marca el conflicto y propone la opción consistente.
