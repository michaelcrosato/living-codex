# AGENTS.md

Terse on purpose. Long context files reduce agent success and cost more tokens. Read `GOAL.md` and `ARCHITECTURE.md` once; keep this open.

## What this project is
A browser top-down 2D RPG. **You build and evolve the engine.** The world's content is authored offline and loaded as static validated data. Players never call an LLM. No procedural generation. No live generation. Determinism is mandatory.

## Commands
- Install: `pnpm install`
- Dev server: `pnpm dev` (runs `app-web` via Vite)
- Typecheck: `pnpm typecheck` (== `tsc --noEmit` across all packages; **must be zero errors**)
- Test: `pnpm test` (Vitest) · single package: `pnpm --filter <pkg> test`
- Lint: `pnpm lint` · Deps gate: `pnpm deps:check` (dependency-cruiser)
- Validate content (schema + refs): `pnpm content:validate`
- Verify content is *playable* (solvability/reachability): `pnpm content:verify`
- Verify replay determinism: `pnpm replay:verify`
- Full gate (run before declaring a ticket done): `pnpm verify` (= typecheck + lint + deps:check + test + content:validate + content:verify + replay:verify)

## Never do these
1. **Never import `pixi.js`** outside `packages/render-pixi/`.
2. **Never import `inkjs`** outside `packages/narrative-ink/`.
3. **Never import an LLM/provider SDK** anywhere in shipped packages. Pipeline lives in `tools/pipeline/` and is offline-only.
4. **Never import the DOM, `node:*`, `fetch`, or any vendor SDK inside `engine-core/`.** It is pure.
5. **Never use `Math.random()` or `Date.now()` in `engine-core/`.** Use `time/rng.ts` and `time/clock.ts`.
6. **Never add `any`** or bare `// @ts-ignore` (must be `// @ts-ignore reason: …`).
7. **Never mutate `World` in place.** Change state only by emitting an `Event` and folding it via `applyEvent`.
8. **Never put non-JSON in `World`.** No class instances, Maps, Sets, functions, dates, or closures anywhere in world state. ECS (Miniplex) is a *derived query layer*, never the source of truth; systems emit events, they do not mutate ECS entities. (`WORLD_STATE.md §6`.)
9. **Never re-run Ink on replay.** Capture Ink state into the event log on each choice; restore it on replay. (`WORLD_STATE.md §4`.)
10. **Never make engine logic depend on a specific piece of content.** Content is data; reference it by ID.
11. **Never add a runtime LLM call.** If a feature seems to need one, stop and flag it — it almost certainly belongs in the offline pipeline.
12. **Never let a file pass 600 lines.** Split it.

## Definition of done (every ticket)
- `pnpm verify` is green.
- New systems/conditions have colocated `*.test.ts` asserting their invariants.
- The replay invariant still holds: `hash(replay(log, seed)) === hash(liveWorld)` (test T-04).
- Public API changes are reflected in the package's `index.ts` and one-paragraph `README.md`.
- You did not touch files outside the ticket's stated scope without saying why.

## How to do common things
- Add a system → `docs/agent-guides/adding-a-system.md`
- Add/extend content → `docs/agent-guides/adding-content.md`
- Add a render capability → `docs/agent-guides/extending-the-renderer.md`
- Evolve the schema / add a new verb → `docs/agent-guides/evolving-the-schema.md`
- Debug / reproduce a bug → `docs/agent-guides/debugging.md`

## File map (where things live)
- Pure simulation → `packages/engine-core/src/` (read `index.ts` first)
- Runtime state contract → `docs/WORLD_STATE.md` (the `World` shape, replay, quest semantics)
- Content shapes/treaty → `packages/content-schema/src/`
- Loading/validation → `packages/content-loader/src/`
- Rendering (vector) → `packages/render-pixi/src/`
- Story runtime → `packages/narrative-ink/src/`
- Save/replay → `packages/persistence/src/`
- Composition root → `packages/app-web/src/`
- Game content → `content/core/` (hand-authored) and `content/generated/` (curated AI)
- Offline content tooling → `tools/pipeline/` (NOT shipped)

## Context budget — "read" vs "touch" (don't confuse them)
- **Reading:** for any task you should be able to act confidently after **reading ≤ ~3 files** (a guide + the files it names). If you find yourself needing to *read* far more than that to understand what to do, the architecture is being violated — flag it.
- **Touching:** a cross-cutting verb legitimately *edits* more than 3 files. Adding "bribe a faction" touches schema + event + apply + a system + its test + a content pack (~6) — that is healthy, expected work, not a violation. Do not flag a change just because it edits >3 files; flag only when *understanding* it requires sprawling reading.
