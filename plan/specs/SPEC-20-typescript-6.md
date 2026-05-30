# SPEC-20 — TypeScript 5.9 → 6.0 (bridge toward TS 7 native)

- **Status:** Todo · **Pillar:** Future-proofing (deps) · **Wave:** 6 · **Priority:** P=7
- **I**=3 **F**=3 **R**=3 **Ft**=4 · **MED risk — isolate; the dual typecheck is the long pole of `verify`.**

## Description
`typescript` is at **5.9.3 → 6.0.x**. TS 6.0 is the **last JS-based line** and the deliberate migration
bridge to **TS 7.0** (the Go-native `tsgo` compiler, stable Jan 2026, ~10× faster typecheck) — moving to
6.0 now surfaces the deprecations TS 7 will enforce, while keeping `tsc` as the authoritative gate. The
project's `pnpm typecheck` runs **two** configs — `tsconfig.json` (pure: excludes DOM libs so
`engine-core` can't import the DOM) and `tsconfig.dom.json` — and it is the slowest step of `pnpm verify`.
6.0 must keep both correct and keep purity enforced.

## Acceptance Criteria
- `typescript` at 6.0.x; `pnpm-lock.yaml` updated.
- **Both** `tsc --noEmit` projects pass with **zero errors** and **no new `any`/`@ts-ignore`** added to
  appease the compiler — fix root causes; reconcile any 6.0 deprecation (removed/renamed flags) by
  editing tsconfig, not by suppressing.
- **Purity preserved:** a planted DOM import inside `engine-core` still errors under `tsconfig.json`
  (the pure project). Prove it once, then revert.
- `typescript-eslint` parser is compatible with TS 6 (bump if needed; coordinate with SPEC-18).
- Full **`pnpm verify` green** (all 174 tests, content gates, replay invariant).

## Implementation approach
Bump TS; `pnpm typecheck`; fix surfaced strictness/deprecations. Re-confirm the split-typecheck purity
guarantee with a temporary planted DOM import in `engine-core`. Optionally evaluate `erasableSyntaxOnly`
(BACKLOG) but do not enable it here unless trivial.

## Files
- `package.json`, `pnpm-lock.yaml`, possibly `tsconfig.json` / `tsconfig.dom.json` / `tsconfig.base.json`.
  **No source collision** expected; **serialize with SPEC-18** (shared typescript-eslint peer).

## Dependencies / prereqs
Network. Couples with SPEC-18 via typescript-eslint's supported-TS range — do one, re-verify, then other.

## Test strategy
Dual `tsc --noEmit` (pure + DOM) → planted-purity-violation smoke → full `pnpm verify`.

## Effort
M (mostly typecheck reconciliation across both configs).

## Out of scope
**TS 7 / `tsgo` adoption** (BACKLOG: evaluate as a *local* typecheck accelerator while keeping `tsc`
authoritative in CI). Enabling `erasableSyntaxOnly` (separate hygiene). Any runtime/behavior change.
