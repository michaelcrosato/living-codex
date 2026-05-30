# SPEC-19 — dependency-cruiser 16 → 17 + `@types/node` align to runtime

- **Status:** Todo · **Pillar:** Future-proofing (deps) · **Wave:** 5 · **Priority:** P=10
- **I**=2 **F**=5 **R**=1 **Ft**=4 · **LOW risk — config + types; re-prove the rules still fire.**

## Description
`dependency-cruiser` is at **16.10 → 17.x**. depcruise is the tool that **enforces vendor isolation**
(`pixi.js` only in `render-pixi`, `inkjs` only in `narrative-ink`, no DOM/`node:*` in `engine-core`) —
the boundary the entire thesis rests on (GOAL §5). Keeping it current protects that guard. Separately,
`@types/node` is at **22.19 → 24.x** while the runtime is **Node v24.15** (and `engines.node >=20`) —
align the types to the runtime so DOM/Node typings are accurate.

## Acceptance Criteria
- `dependency-cruiser` at 17.x; `.dependency-cruiser.cjs` migrated for any v17 config-schema change.
- **All existing rules still fire correctly** — re-prove ONE rule (e.g. `engine-core` importing the DOM,
  or a cross-layer import) via a temporary planted violation that `pnpm deps:check` rejects, then revert
  the planted edit (SPEC-07 practice). Record the proof in Notes.
- `@types/node` major matches the Node runtime line (24.x; do **not** jump to 25 unless Node is on 25).
  Both `tsc --noEmit` projects (pure + DOM) stay green.
- `pnpm deps:check` + full **`pnpm verify` green**.

## Implementation approach
Bump both devDeps; `pnpm install`; `pnpm deps:check`. If depcruise 17 changed `.cjs` options, migrate.
Planted-violation smoke test → revert. `pnpm typecheck` to confirm the `@types/node` bump is clean.

## Files
- `package.json`, `.dependency-cruiser.cjs`, `pnpm-lock.yaml`. **No source collision.**

## Dependencies / prereqs
Network for the dep bump. Independent of other specs (config + types only).

## Test strategy
`pnpm deps:check` (+ temporary planted violation to prove rules fire) → `pnpm typecheck` (both tsconfigs)
→ `pnpm verify`.

## Effort
S.

## Out of scope
Adding new layer rules (SPEC-07 already added them); type-error fixes beyond what the `@types/node` bump
requires; bumping to `@types/node` 25 (runtime is 24).
