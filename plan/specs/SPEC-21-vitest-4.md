# SPEC-21 — Vitest 3 → 4 (+ coverage-v8 4)

- **Status:** Todo · **Pillar:** Future-proofing / Quality · **Wave:** 7 · **Priority:** P=7
- **I**=3 **F**=3 **R**=3 **Ft**=4 · **MED risk — coverage numbers shift; mock semantics change; isolate.**

## Description
`vitest` + `@vitest/coverage-v8` are at **3.2.4 → 4.1.x**. Vitest 4 requires **Vite ≥6** (repo has 7.3.x)
and **Node ≥20** (repo has 24) — prereqs already met. Breaking changes that matter here:
- **V8 coverage remap** — coverage results change vs v3 (report-only in this repo, so re-baseline the
  numbers; do **not** add a floor as part of this spec).
- **`workspace` → `projects`** config rename (Vitest 3.2+) — check `vitest.config.ts`.
- **Mock/spy isolation** + `vi.fn().getMockName()` now returns `vi.fn()` (not `spy`) — audit any snapshot
  or assertion that depends on `[MockFunction spy]` or on automock prototype sharing.

The **determinism gate** (`pnpm replay:verify` = `vitest run -t "replay invariant"`) and the fuzz/PBT
specs MUST stay green and still be selected by the `-t` tag.

## Acceptance Criteria
- `vitest` + `@vitest/coverage-v8` at 4.x; `pnpm-lock.yaml` updated.
- `vitest.config.ts` migrated (`workspace`→`projects` if present; `poolOptions` to top-level if used).
- **All 174 tests pass**; `pnpm replay:verify` green and still matches the same tagged tests;
  `pnpm test:coverage` runs and the **new coverage baseline is recorded** in PROGRESS (report-only).
- No test relied on the old mock-name/automock behavior (fix any that do).
- Full **`pnpm verify` green**; CI coverage artifact still uploads (verify.yml unchanged or minimally adjusted).

## Implementation approach
Bump both deps; read the Vitest 4 migration guide; migrate `vitest.config.ts`; run `pnpm test` (targeted)
then `pnpm verify`; run `pnpm test:coverage` and note the new numbers. Grep tests for `getMockName`,
`MockFunction`, `mockReset`, `vi.mock` to catch semantic changes.

## Files
- `package.json`, `vitest.config.ts`, `pnpm-lock.yaml`, possibly `.github/workflows/verify.yml` (coverage
  step). **Collision:** `verify.yml` — coordinate if a CI-editing spec runs concurrently.

## Dependencies / prereqs
Network. Independent of SPEC-22 (different files) — both are "test tooling" and may run in parallel
worktrees. No Vite 8 (BACKLOG); Vitest 4 works on Vite 7.

## Test strategy
Full `pnpm test` + `pnpm replay:verify` + `pnpm test:coverage` → `pnpm verify`. Re-baseline coverage in
PROGRESS so a future regression is detectable.

## Effort
M.

## Out of scope
Adding coverage floors/thresholds; new tests; Vite 7→8; restructuring the test layout.
