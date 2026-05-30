# SPEC-32 — Drama-manager "waypoint" salience steering (offline, deterministic)

- **Status:** Done · **Pillar:** Player Experience · **Wave:** Cycle-3 Phase 2 (Major Features) · **P=7**
- **I**=4 **F**=2 **R**=3 **Ft**=4 · **MED-HIGH risk — design note written below; pure deterministic salience policy; replay-safe.**

## Description & expected impact
Storylets (SPEC-11) + real storylet content (SPEC-24) + pipeline emission (SPEC-26) now exist. The next
depth step is a **drama manager**: a *static, deterministic* salience-weighting policy that nudges which
**reactive/ambient** storylets surface so the world feels like it's responding toward the next authored beat —
without a runtime planner and without ever driving the main plot (which stays gated behind explicit quest
flags). Modern formulations treat salience as a planning step-cost; here it is a **pure ranking refinement**,
not search. (Research: [Ware 2022 salience planning](https://cs.uky.edu/~sgware/reading/papers/ware2022salience.pdf),
[emshort salience-based narrative](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/).)

## Design note (2026-05-30) — the waypoint salience policy
Rank storylets by **effective salience** = `base_salience + waypointBonus(world, storylet)`, where the
bonus is a **pure, integer, World-derived** function (no `Math.random`/`Date.now`, no float):

- `focusFactions(world)` = the faction ids where `world.reputation[f] >= 10` (the player's *trajectory* —
  who they're aligning with), enumerated in a deterministic (sorted) order.
- `waypointBonus(world, storylet)`:
  - `0` if the storylet is tagged `"main"` (reactive-only guardrail — main plot is NEVER steered);
  - else `min(3, count of storylet.tags that are a focus faction id)` — a content-author convention:
    *tag a reactive storylet with a faction id to make it surface more when the player is rising with
    that faction.* Bounded at +3 so no single storylet dominates.
- Selection is unchanged otherwise: pick max **effective** salience; ties broken by the **seeded RNG inside
  `applyEvent`** (the existing `TriggerStorylet` fold), so it stays replay-deterministic.

**Why this is safe:** the bonus reads only `world.reputation` + `storylet.tags` (integers/strings), so replay
reproduces it exactly; it only re-orders *reactive* flavor; `"main"`-tagged storylets are excluded; and with
no aligned faction (or no faction-tagged storylet) the bonus is 0 everywhere → **identical to the SPEC-11
baseline** (a tested equivalence). No new `World` field; `storyletSystem` already receives `world`, so no
signature change.

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
