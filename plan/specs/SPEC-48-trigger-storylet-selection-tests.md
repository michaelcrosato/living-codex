# SPEC-48 — Pin TriggerStorylet selection in the reducer

- **Status:** Done · **Pillar:** Quality / Determinism · **Wave:** Cycle-6 P0 (REPLENISH, data-driven) · **Cycle:** 6

## Description & impact
SPEC-47 left one genuine survivor cluster in `apply.ts`: the **`TriggerStorylet` handler** (lines 275–297),
which delivers salience-selected storylet content at runtime (the SPEC-11/24/25/26 storylet system). Its
selection arms were unpinned — empty-candidate no-op, the single-candidate fast path (which must consume
**no** randomness, so it stays replay-stable), and the multi-candidate seeded tie-break (which **must**
consume randomness and pick exactly one). A regression here would mis-deliver content or — worse — desync
the RNG stream and break the replay invariant for every event after it.

## DoD & acceptance
- `apply.test.ts` gains 3 tests: no candidates → no-op; a single candidate → its effect applies and
  `rngState` is **unchanged**; multiple candidates → **exactly one** effect applies (seeded) and `rngState`
  **advances**. Selection is made observable by giving each storylet a distinct `give_item` effect.
- All pass via real execution; `pnpm verify` green.
- `apply.ts` mutation rises from 82.76% (the storylet-selection survivors killed); remaining survivors are
  the documented low-value set (clamp equivalents, objective defaults, fresh-state array literals, and the
  ambient-text branch, which is a no-op on `World` so it is behaviorally equivalent).

## Approach
Additive tests only. A `grantStorylet(id, item)` helper builds a minimal storylet whose lone effect grants
an item, so which candidate was selected is visible in `inventory`; `rngState` (un)changed distinguishes the
single- vs multi-candidate code paths.

## Test strategy
Real execution (`applyEvent(world, TriggerStorylet)` → inventory + rngState assertions); re-run
`pnpm exec stryker run --mutate .../apply.ts` to confirm the selection arms are covered.
