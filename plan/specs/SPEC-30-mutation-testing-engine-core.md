# SPEC-30 — Stryker mutation testing on `engine-core`

- **Status:** Todo · **Pillar:** Quality · **Wave:** Cycle-3 Phase 1 (Core Upgrades) · **P=10**
- **I**=4 **F**=3 **R**=2 **Ft**=5 · **LOW-MED risk — dev-only, offline, report-only first; scoped to the critical core.**

## Description & expected impact
GOAL §5.8: *"Tests are the contract. The agent is graded by the test runner."* But **coverage measures
reach, not bug-catching** — a suite can have high coverage and still let a regression slip through (the engine
is determinism-critical, so this matters a lot). **Mutation testing** (Stryker) introduces small code changes
("mutants") and checks whether tests *fail*; surviving mutants reveal blind spots. Establish a baseline
mutation score on `engine-core` (the pure simulation: apply/effects/conditions/systems/tick/rng), where a
silent regression is most dangerous. Report-only first; ratchet later. (Research:
[Stryker](https://stryker-mutator.io/), [mutation testing 2026](https://oneuptime.com/blog/post/2026-01-25-mutation-testing-with-stryker/view).)

## Definition of Done & Acceptance Criteria
- Dev deps: `@stryker-mutator/core` + the **Vitest runner** (`@stryker-mutator/vitest-runner`) +
  `@stryker-mutator/typescript-checker`; `stryker.config.json` (or `.mjs`) scoped to
  **`packages/engine-core/src/**` (excluding `*.test.ts`)**.
- A `pnpm mutation` script runs Stryker on engine-core and prints a **mutation score**; the run completes
  offline and deterministically enough to record a baseline (use incremental + per-test coverage so it's
  minutes, not hours).
- **Baseline recorded** in PROGRESS (the score is the deliverable; do NOT block CI on it yet — report-only,
  like coverage started). If the score is < ~60%, file the worst surviving-mutant clusters as BACKLOG
  test-gap items (do not fix them all in this spec — that's scope creep).
- Does **not** touch the shipped gate: `pnpm verify` unchanged; Stryker is a separate command (+ optional
  non-blocking CI job).
- `pnpm verify` still green; mutation run produces a report.

## Implementation approach
Install Stryker + vitest-runner + ts-checker; config: `mutate: ["packages/engine-core/src/**/*.ts",
"!**/*.test.ts"]`, `testRunner: "vitest"`, `checkers: ["typescript"]`, `incremental: true`,
`concurrency` tuned for CI. Run `pnpm mutation`; record the score. Triage (don't fix) survivors → BACKLOG.

## Files
- `package.json` (devDeps + `mutation` script), `pnpm-lock.yaml`, `stryker.config.json`, possibly
  `.github/workflows/*` (a non-blocking mutation job; collision with SPEC-28 if both edit CI — serialize),
  PROGRESS, `.gitignore` (Stryker `.stryker-tmp`/reports). No engine source change.

## Test strategy
The Stryker run *is* the test of the tests. Sanity-check the harness by confirming it kills an obvious
mutant (e.g. flips a `>=` in `conditions.ts`) and reports survivors elsewhere. Record the baseline score.

## Effort
M (harness setup + first run + triage).

## Out of scope
Fixing every surviving mutant (file as BACKLOG); blocking CI on mutation score; mutating content-loader/
app-web/pipeline in this spec (engine-core first; expand later); a score ratchet (a later spec once stable).
