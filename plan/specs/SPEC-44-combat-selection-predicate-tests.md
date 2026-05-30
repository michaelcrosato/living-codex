# SPEC-44 — Pin the combat target-selection predicate

- **Status:** Done · **Pillar:** Quality / Correctness · **Wave:** Cycle-6 P0 (REPLENISH, data-driven) · **Cycle:** 6

## Description & impact
A Cycle-6 engine-core mutation **re-measure** (the SPEC-30 baseline was stale after SPEC-34/36/37) put the
package at 69.83% and — surprisingly — left **`combat.ts` at 50%**, even though SPEC-34 added the HP≥0
overkill invariant. The survivors clustered entirely on the **target-selection predicate** (`combat.ts:19`
`e.id !== player.id && e.locationId === player.locationId && e.alive && e.hp !== undefined`) plus the Attack
guard (`combat.ts:16`). SPEC-34 hardened the *damage/HP* side (in `applyEvent`), but nothing pinned *who gets
picked as the target*. That is real gameplay-correctness logic (it backs the `defeat` objective and the
canon "placement ⟹ alive" derivation), **not** low-risk plumbing — so the Cycle-6 close-out wrongly lumped
combat into the "do-not-chase" bucket. This corrects that with targeted tests.

## DoD & acceptance
- `combat.test.ts` gains a "target selection" block: a non-Attack input is ignored; a **dead** entity, a
  **no-hp** non-combatant, an entity in a **different location**, and the **player themselves** (made
  attackable on every other arm) are each NOT targeted — each isolating one predicate arm so its mutant dies.
- All pass via real execution; `pnpm verify` green.
- `combat.ts` mutation score **rises materially** from 50% (scoped re-mutation).

## Approach
Additive tests only — `combat.ts` is correct; the gap was coverage. A `withEntity(over)` helper spawns one
entity that is a valid target on every arm, then overrides exactly one arm to make it ineligible (so a
mutant that drops that arm would wrongly target it). The no-hp case omits `hp` entirely
(`exactOptionalPropertyTypes`), and the self case overwrites the player via `SpawnEntity` to give it hp.

## Test strategy
Real execution (`combatSystem(inputs)(world, 0)` returns `[]` when the sole candidate fails one arm); re-run
`pnpm exec stryker run --mutate .../combat.ts` to confirm the jump. Mutation report-only (not a gate).
