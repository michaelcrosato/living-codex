# SPEC-28 — Coverage non-regression floor (CI)

- **Status:** Todo · **Pillar:** Quality · **Wave:** Cycle-3 Phase 0 (Quick Wins & Safety) · **P=9**
- **I**=3 **F**=4 **R**=2 **Ft**=4 · **LOW-MED risk — could flake CI if set too tight; set with headroom.**

## Description & expected impact
SPEC-03/SPEC-21 made coverage **report-only**. Coverage is now baselined (Vitest 4 v8 remap, 2026-05-29):
**75.13% stmts / 65.14% branch / 76.14% funcs / 76.93% lines.** Turn the report into a **non-regression
guard** so a future change that quietly deletes tested behavior fails CI — without becoming a flaky
nuisance. Pairs with SPEC-30 (mutation testing measures test *quality*; this measures test *reach*).

## Definition of Done & Acceptance Criteria
- `vitest.config.ts` `coverage.thresholds` set **conservatively below the current baseline** (e.g. stmts 72,
  branch 60, funcs 72, lines 72 — ~3pt headroom) so normal work never trips it but a real regression does.
- `pnpm test:coverage` **fails** when coverage drops below a threshold (prove with a temporary threshold set
  above current, then revert to the headroom values).
- CI: the coverage step enforces thresholds (still a *separate* step; the existing blocking `pnpm verify`
  contract is unchanged — do not fold coverage into `verify`'s critical path unless desired and noted).
- The baseline + thresholds are documented (here + PROGRESS).
- `pnpm verify` green; `pnpm test:coverage` green at the chosen thresholds.

## Implementation approach
Add `thresholds: { statements: 72, branches: 60, functions: 72, lines: 72 }` (tune to ~3pt under measured)
to `coverage` in `vitest.config.ts`. Update `.github/workflows/verify.yml` to run `pnpm test:coverage` as a
gating step (or keep report-only + add a separate threshold check) — decide and document. Avoid per-file
thresholds (too brittle).

## Files
- `vitest.config.ts`, `.github/workflows/verify.yml` (collision: also touched by SPEC-30 if both edit CI —
  serialize), PROGRESS.

## Test strategy
Temporarily set a threshold above current → `pnpm test:coverage` fails (proves the gate) → revert to
headroom values → passes. Confirm `pnpm verify` unaffected.

## Effort
S.

## Out of scope
Per-file thresholds; raising actual coverage (write tests only where SPEC-30 reveals gaps); making e2e blocking.
