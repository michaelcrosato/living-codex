# SPEC-32 — Drama-manager "waypoint" salience steering (offline, deterministic)

- **Status:** Todo · **Pillar:** Player Experience · **Wave:** Cycle-3 Phase 2 (Major Features) · **P=7**
- **I**=4 **F**=2 **R**=3 **Ft**=4 · **MED-HIGH risk — DESIGN NOTE REQUIRED FIRST; touches the storylet selector + replay.**

## Description & expected impact
Storylets (SPEC-11) + real storylet content (SPEC-24) + pipeline emission (SPEC-26) now exist. The next
depth step is a **drama manager**: a *static, deterministic* salience-weighting policy that nudges which
**reactive/ambient** storylets surface so the world feels like it's responding toward the next authored beat —
without a runtime planner and without ever driving the main plot (which stays gated behind explicit quest
flags). Modern formulations treat salience as a planning step-cost; here it is a **pure ranking refinement**,
not search. (Research: [Ware 2022 salience planning](https://cs.uky.edu/~sgware/reading/papers/ware2022salience.pdf),
[emshort salience-based narrative](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/).)

## Definition of Done & Acceptance Criteria
- **Design note FIRST** (in this spec's Notes, before code): define the weighting precisely — e.g. effective
  salience = `base_salience + f(distance from current World to the active quest's next objective)`, computed
  **purely** from `World` + content, with ties broken by the existing seeded RNG **inside `applyEvent`**.
  State exactly why it stays replay-deterministic and reactive-only.
- The `storyletSystem` (or a pure helper it calls) applies the weighting deterministically; **no `Math.random`/
  `Date.now`**, no new World field unless folded via an event (prefer none). engine-core stays pure.
- **Replay invariant holds** (`hash(replay)===hash(live)`) with steering active — add/extend a colocated test;
  the SPEC-31 model-based suite must still pass.
- A guardrail test proves steering **never** selects a non-reactive (main-plot-tagged) storylet, and that with
  steering off (no active quest) behavior equals the SPEC-11 baseline.
- `content:verify` + full `pnpm verify` green; golden-master untouched (engine logic, not generated content).

## Implementation approach
Write the design note; implement the weighting as a **pure function** over `(world, storylet, registries)`
used by `storyletSystem` to compute effective salience before the max-salience selection. Keep selection
deterministic; reuse `evaluateAll`/condition reads. Tag main-plot storylets and exclude them from steering.
Extend `storylet.test.ts` + add a steering-specific test.

## Files
- `packages/engine-core/src/systems/storylet.ts` (+ a small pure `salience` helper, possibly its own file to
  stay <400 lines), `storylet.test.ts`, `docs/SCHEMA.md`/`WORLD_STATE.md` note. **Collision:** storylet
  selector — do not run concurrently with another storylet-selector spec.

## Dependencies / prereqs
SPEC-24 (storylet content) landed ✓. Soft: SPEC-31 (model-based suite) helps prove determinism. Needs the
design note before implementation.

## Test strategy
Storylet selection unit tests (steering on/off), replay-invariant test with steering active, guardrail test
(no main-plot via salience), model-based suite (SPEC-31) green. Then `pnpm verify`.

## Effort
L (design + careful determinism).

## Out of scope
A runtime/search-based planner; gating main-plot beats on salience (forbidden); new content (SPEC-33);
authoring-time visualization tools.
