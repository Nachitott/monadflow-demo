# Error Index

Registro de errores y soluciones.

* [Volver al Contexto Maestro](../../CONTEXTO_MAESTRO.md)

---

## 2026-10-09

### E1 — `forge`/`solc` no encontrados en PATH
- **Mensaje:** `forge: command not found`, `solc: command not found`.
- **Causa raíz:** Foundry 1.8.4 está instalado en `~/.foundry/bin/` (Windows) pero el directorio no figura en el PATH del shell Git Bash.
- **Solución:** invocar `~/.foundry/bin/forge.exe` por ruta completa o `export PATH="$HOME/.foundry/bin:$PATH"` al inicio de cada sesión de contratos.

### E2 — `forge soldeer install` falla: "error during IO operation: not connected"
- **Mensaje:** `Failed to run soldeer: error during IO operation: not connected` (tanto para el registry como para install con URL git explícita).
- **Causa raíz:** `registry.soldeer.xyz` no resuelve desde esta red (curl → código 000); GitHub sí es accesible (200).
- **Solución:** fallback a `forge install --no-git <org/repo>@<tag>`, que clona con git a `lib/` y descarta `.git`. Deps quedan vendored e ignoradas por `.gitignore`.

### E3 — Comandos git dentro de `lib/` resolvieron el repo padre del workspace
- **Mensaje:** `git checkout v5.6.1` dentro de `lib/openzeppelin-contracts` abortó listando archivos del workspace (`.obsidian/graph.json`, `00_System/Agents/...`).
- **Causa raíz:** (a) el workspace raíz SÍ es repo git (`origin` → `Nachitott/monadflow-demo.git`), contra lo indicado en `AGENTS.md` §9; (b) `forge install --no-git` deja los clones SIN `.git` propio → git sube el árbol y opera sobre el repo padre. Un `git remote set-url` y un `fetch tag` corrieron accidentalmente contra el repo del usuario.
- **Solución:** restaurado `origin` a `monadflow-demo` y borrados los tags espurios (`v5.6.1`, `v1.9.7`). Regla operativa: **nunca correr comandos git dentro de `lib/`**; para fijar versión usar `forge install --no-git repo@tag` o reinstalar.
- **Pendiente:** `AGENTS.md` dice "No hay git" — desactualizado; informar al usuario (no modificado, fuera del dominio del agente).

## 2026-10-13

### E4 — Linter de forge 1.8 (Solar): 3 warnings en MockExchange
- **Mensaje:** `missing-events-arithmetic` en `arsPerUsd = newArsPerUsd` y `reentrancy-events` ×2 (`emit Converted` después de llamadas externas).
- **Causa raíz:** forge 1.8 incluye linter estático que exige eventos asociados a cambios de estado usados en aritmética, y desaconseja emitir eventos tras external calls.
- **Solución:** `setRate` → write primero, `RateUpdated` después (capturando `previousRate`); swaps → `emit Converted` movido antes de `transferFrom`/`mint` (seguro: los logs solo persisten si la tx no revierte). Build final sin warnings.

### E5 — "Stack too deep" al destructurar struct público de 11 campos en test
- **Mensaje:** `Compiler error: Stack too deep ... test/TimeStream.t.sol:392` en helper que destructuraba el tuple del getter `sessions(id)`.
- **Causa raíz:** el getter autogenerado de un struct público devuelve un tuple de N campos; destructurar 11 campos + variables locales supera el límite de stack del codegen legacy (sin via-IR).
- **Solución:** agregada view `getSession(bytes32) returns (StreamSession memory)` al contrato (devuelve struct, no tuple) — evita destructure y además sirve al frontend. Alternativa descartada: `via_ir` global (innecesario y más lento).

### E6 — `vm.expectEmit` falla con topic indexed desconocido (`sessionId`)
- **Mensaje:** `[FAIL: Transfer != expected StreamStarted]` en `test_StartStreamRegistry`.
- **Causa raíz:** `expectEmit(true, true, true, true)` compara topic1 (`sessionId`) contra `bytes32(0)` placeholder — el id real se deriva dentro de la llamada (`keccak256(user, merchant, nonce, timestamp)`) y no se conoce antes.
- **Solución:** `expectEmit(false, true, true, true)` — se verifican actor (`user`, `merchant`) y data; topic1 se omite cuando el valor no es predecible. Patrón aplicable a todos los eventos con id generado on-chain.
