# SPEC-05 — fast-check command-sequence fuzzing of the replay invariant

- **Status:** Todo · **Pillar:** Quality/Determinism · **Wave:** 1 · **Priority:** P=10
- **I**=4 **F**=3 **R**=2 **Ft**=5

## Description
`fast-check` is already a dependency but the suite uses it lightly. The strongest determinism guarantee is a
**property**: *for any valid sequence of player inputs, `hash(replay(log,seed))===hash(live)`*. Add
model/command-style property tests that generate random input sequences, drive a headless `GameSession`, then
replay the produced log and assert hash equality. Finds edge cases example-based tests miss. (Research:
[fast-check why-PBT](https://fast-check.dev/docs/introduction/why-property-based/).)

## Acceptance Criteria
- A new property test (headless, node env) generates arrays of valid `InputEvent`s — `Move{dir}`, `Interact`,
  `Attack`, `Attempt{questId,branchId}`, `Bribe{…}`, `Choose{dialogueId,choiceIndex}` — with values bounded to
  the loaded fixture content (no invalid IDs).
- For each generated sequence: build a `GameSession` (existing fixture, e.g. the warehouse/opening packs),
  `step()` through the inputs, then `replay(session.log)` and assert the final hash equals the live hash
  (reuse SPEC-04's `firstDivergence` for a precise message on failure).
- `numRuns` bounded (e.g. 100–200) so the test stays fast; fast-check `seed` pinned for reproducibility; on
  failure it **shrinks** to a minimal failing input sequence (filed as a BACKLOG bug if it reveals a real defect).
- Test lives where a headless session is constructible (e.g. `packages/app-web/test/replay-fuzz.spec.ts`,
  matching the existing `session.spec.ts` pattern) and is **tagged so `pnpm replay:verify` picks it up** (it
  greps `-t "replay invariant"`), or explicitly note it runs under `pnpm test`.
- `pnpm verify` green; runtime impact acceptable (report the added duration).

## Implementation approach
Read `packages/app-web/src/session.ts` and an existing `app-web/test/*.spec.ts` for fixture wiring + the
`Narrative` stub. Use `fc.array(fc.oneof(...inputArbitraries))`, constraining arbitraries to fixture IDs.
Model-based (`fc.commands`) is optional polish; a generated-array property is sufficient and simpler. Assert
via `hash()` from engine-core.

## Files
- `packages/app-web/test/replay-fuzz.spec.ts` (new). Read-only: `session.ts`, an existing spec, engine-core `snapshot`/`log`.

## Dependencies / prereqs
Soft-depends on **SPEC-04** (nicer divergence messages) but works without it. Needs the existing test fixtures.

## Test strategy
The test *is* the strategy. Verify it actually exercises branches (e.g. occasionally triggers a skill check /
bribe) — log a coverage note. Ensure it's deterministic across runs (pinned seed).

## Effort
M (~2 hr — getting arbitraries bounded to valid content is the work).

## Out of scope
Fuzzing content *loading* (that's `content:validate`); multi-session/save-load fuzzing (BACKLOG); raising
global coverage thresholds (SPEC-03 is report-only).
