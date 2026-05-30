# SPEC-49 — Pin save-migration + replay-divergence robustness edges

- **Status:** Done · **Pillar:** Quality / Robustness · **Wave:** Cycle-6 P0 (REPLENISH, data-driven) · **Cycle:** 6

## Description & impact
Completing the pure-logic mutation sweep, the full table flagged two more files below threshold whose
*genuine* survivors are robustness/tooling edges (the rest were low-value strings):

- **`migrate.ts`** (67.86%) — the runtime save-migration runner. Untested arms: line 28 (reject a
  **non-object / null** input — a corrupt save) and line 38 (reject a migration step that **fails to
  advance the version** — a buggy step that would otherwise spin). Both are loud-failure guards on the
  save-load boundary; a regression would silently mis-load or hang.
- **`log.ts`** (72.34%) — the replay envelope. `firstDivergence` (the SPEC-04 divergence-bisection tool) had
  its main path tested, but **not** the **length-mismatch tail** (one trace longer than the other — a log
  replayed with extra/fewer steps), and `replayTrace`'s own **seed guard** (line 100) was untested.

## DoD & acceptance
- `migrate.test.ts` +2: a non-object/null/number input throws `/expected an object/`; a step that doesn't
  bump the version throws `/did not advance/`.
- `replay.test.ts` +2: `firstDivergence` on traces of unequal length reports the tail step (index at the
  shared-prefix length, with the shorter side's entry `undefined`); `replayTrace` throws on a seed mismatch.
- All pass via real execution; `pnpm verify` green. `migrate.ts` + `log.ts` mutation rise; residual
  survivors are low-value (version/engine strings, the `Math.min` bound, the tick-vs-hash arm that can't be
  diverged independently of the hash).

## Approach
Additive tests only — both files are correct; the gap was coverage. The length-mismatch test builds a short
and a long log sharing an **idempotent** prefix (repeated SetFlag) so divergence is purely the extra tail
step, isolating the tail branch.

## Test strategy
Real execution (`runMigrations` throws; `firstDivergence` returns the tail descriptor; `replayTrace`
throws); re-run `pnpm exec stryker run --mutate` on each file to confirm the arms are covered.
