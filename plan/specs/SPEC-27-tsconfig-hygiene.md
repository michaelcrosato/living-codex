# SPEC-27 — Minor dep hygiene + `erasableSyntaxOnly`

- **Status:** Done (scope reduced) · **Pillar:** Future-proofing · **Wave:** Cycle-3 Phase 0 · **P=10**
- **I**=2 **F**=5 **R**=1 **Ft**=4 · **LOW risk.**

> **Outcome (2026-05-30):** Shipped the `vite-tsconfig-paths` 5→6 bump. **`erasableSyntaxOnly` was
> evaluated and DEFERRED** — the original premise was incomplete: the flag also bans **parameter
> properties** (constructor `readonly`/`private` params), which the codebase uses idiomatically in
> **6 files** (`session.ts`, `render-pixi/renderer.ts`, `dialogue-controller.ts`, `dialogue-view.ts`,
> `llm/stub.ts`, `llm/openrouter.ts`, `llm/adapter.ts`). Crucially, the project **emits via Vite/esbuild,
> not a type-stripping runtime**, so the flag's only benefit (type-strip compatibility) does not apply
> here — enabling it would force a 6-file refactor of clean DI constructors for zero functional gain,
> violating "don't refactor without cause" (GOAL §7 / AGENTS). The flag fires correctly (verified via a
> planted `enum` → TS1294); the decision is cost/benefit, not capability. Re-evaluate only if a
> type-stripping runtime (`node --strip-types`) is ever adopted. Logged to BACKLOG.

## Description & expected impact
After Cycle 2, `pnpm outdated` shows only two minor items. Close the trivial gap and add one TS-7-forward
safety flag:
- `vite-tsconfig-paths` 5.1 → 6.x (dev-only path-alias resolver; minor).
- Enable `compilerOptions.erasableSyntaxOnly` in `tsconfig.base.json` — bans TS `enum`/`namespace`/
  parameter-properties (non-erasable syntax) so the codebase stays compatible with type-stripping
  runtimes and `tsgo` (SPEC-29). **Verified safe:** a grep found zero `enum`/`namespace` declarations
  (the only "enum" is `z.enum`, a runtime value), so this is purely a guard against future drift.
- **Do NOT bump `@types/node` to 25** — it must track the Node **24** runtime (SPEC-19 rationale); 25 would
  type against APIs not present at runtime.

## Definition of Done & Acceptance Criteria
- `vite-tsconfig-paths` at 6.x; `pnpm-lock.yaml` updated; Vite/Vitest still resolve `@codex/*` aliases
  (tests green).
- `erasableSyntaxOnly: true` added to `tsconfig.base.json`; both `tsc --noEmit` projects stay green (no code
  change required since there is no enum/namespace).
- `@types/node` remains on 24.x (documented).
- Full **`pnpm verify` green** (185 tests).

## Implementation approach
`pnpm add -Dw vite-tsconfig-paths@6`; add `"erasableSyntaxOnly": true` to `tsconfig.base.json`
compilerOptions; `pnpm verify`. If `vite-tsconfig-paths` 6 changes its plugin API, reconcile in
`vitest.config.ts`.

## Files
- `package.json`, `pnpm-lock.yaml`, `tsconfig.base.json`, possibly `vitest.config.ts`. No source.

## Test strategy
`pnpm typecheck` (both configs) + full `pnpm verify`; a planted `enum` (temporary) should now error under
`erasableSyntaxOnly`, then revert.

## Effort
S.

## Out of scope
`@types/node` 25 (runtime is 24); any code refactor; tsgo (SPEC-29).
