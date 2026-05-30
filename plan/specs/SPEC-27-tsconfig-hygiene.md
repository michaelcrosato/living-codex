# SPEC-27 — Minor dep hygiene + `erasableSyntaxOnly`

- **Status:** Todo · **Pillar:** Future-proofing · **Wave:** Cycle-3 Phase 0 (Quick Wins & Safety) · **P=10**
- **I**=2 **F**=5 **R**=1 **Ft**=4 · **LOW risk — config only; verified no enum/namespace usage.**

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
