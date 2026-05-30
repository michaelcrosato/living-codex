# SPEC-31 — `fc.commands` model-based determinism suite

- **Status:** Todo · **Pillar:** Quality / Determinism · **Wave:** Cycle-3 Phase 1 (Core Upgrades) · **P=10**
- **I**=4 **F**=3 **R**=2 **Ft**=5 · **LOW-MED risk — additive test; a true failure = a real bug (R1).**

## Description & expected impact
SPEC-05 fuzzes *flat random input sequences*. fast-check 4 (SPEC-22) is in, so adopt its **model-based
testing** API (`fc.commands`): define player actions as Commands, run each against the **real GameSession**
and a tiny **reference model**, and assert invariants **after every command** — with automatic shrinking to a
minimal failing trace. This catches state-machine bugs (ordering, accumulation, conservation) that flat
fuzzing misses, and is the 2026 best-practice for fuzzing a deterministic state machine.
(Research: [fast-check model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/).)

## Definition of Done & Acceptance Criteria
- A new `packages/app-web/test/model-based.spec.ts` (or in engine-core) defines Commands (Move, Interact,
  Attack, UseExit, Attempt, Bribe) with `check(model)` guards and `run(model, real)` bodies.
- **Invariants asserted per command** (the model + real must agree on each): credits never negative; no
  entity HP < 0; `hash(replay(log)) === hash(live)` holds at every step; quest status transitions are legal.
- Seed pinned; `numRuns` bounded (~50–100) so CI stays fast; uses `fc.commands` + `fc.modelRun`.
- If it surfaces a divergence, **shrink + file + fix or revert** (R1) — never silence; if it's purely a
  test-perf issue, bound runs and note it.
- Complements (does not replace) SPEC-05's `replay-fuzz.spec.ts`. `pnpm verify` + `pnpm replay:verify` green.

## Implementation approach
Use `fc.commands([...commandArbs])` + `fc.modelRun(() => ({ model, real }), cmds)`. The model is a minimal
mirror (e.g. tracks credits/flags/quest status); the real is a `GameSession` over `pack.opening`. Each
Command's `check` gates legality; `run` applies to both and asserts the invariants. Keep it deterministic
(seeded) and bounded.

## Files
- `packages/app-web/test/model-based.spec.ts` (new). Possibly a small exported model helper. No engine source.

## Test strategy
The suite itself is the test; verify it (a) passes deterministically across a couple of seeds, (b) actually
exercises multiple commands (assert command coverage/log length), (c) would catch a planted invariant break
(temporarily perturb the model, confirm failure + shrink, revert).

## Effort
M.

## Out of scope
Replacing SPEC-05; modelling dialogue/Ink internals (out of model scope); unbounded run counts.
