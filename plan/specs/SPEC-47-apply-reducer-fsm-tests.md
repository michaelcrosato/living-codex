# SPEC-47 — Pin the event-reducer's quest-FSM + conservation edges

- **Status:** Done · **Pillar:** Quality / Determinism · **Wave:** Cycle-6 P0 (REPLENISH, data-driven) · **Cycle:** 6

## Description & impact
The full engine-core mutation table (not just the BACKLOG hotspots) showed `apply.ts` — the pure, exhaustive
**event-fold reducer** that applies every state transition, the deterministic heart of the engine — at
**71.55% with 29 survivors**. (I had prematurely called the sweep complete after the 5 hotspot files.)
Inspecting the survivors, the highest-value cluster is the **quest runtime FSM** and the **conservation
chokepoints**, whose edge transitions were unpinned by the existing apply.test (which covered reputation
clamp, the below-zero throw, EnterLocation, and Offer/Start idempotency only):
- `ActivateQuest` idempotency (must not reset an active quest's branches) + the active-branch list.
- `CompleteQuestBranch` atomicity/idempotency (a completed quest never re-completes a different branch).
- `ForecloseBranch` (remove a branch; the quest transitions to `failed` **only** when the last one is gone).
- `ResolveAttack` damage bonus (the **player's** force adds to the roll; a **non-player** attacker gets 0).
- `BribeFaction` affordability (shift standing + spend credits only if affordable; else a no-op).
- `GiveItem` boundary (an inventory of **exactly 0** is allowed; only NEGATIVE throws).

These are real determinism/correctness arms — a regression would silently corrupt quest state, combat
damage, or the economy, and only the replay invariant might (or might not) catch it downstream.

## DoD & acceptance
- `apply.test.ts` gains 6 targeted tests for the above. `ResolveAttack` isolates the force bonus by
  branching two attacks from the **same** rngState (identical d6 roll) and asserting the player's damage
  exceeds a non-player's by exactly `skills.force`.
- All pass via real execution; `pnpm verify` green.
- `apply.ts` mutation rises materially from 71.55% (scoped re-mutation).

## Approach
Additive tests only — `apply.ts` is correct; the gap was coverage. Build worlds via `createWorld` +
`applyEvent` event sequences and assert the resulting `quests`/`inventory`/`reputation`/`entities` state.

## Test strategy
Real execution; re-run `pnpm exec stryker run --mutate .../apply.ts` to confirm the FSM/conservation arms
are covered. Remaining survivors (storylet-selection branch, clamp equivalents, fresh-state array literals)
are lower-value / a possible bounded follow-up. Mutation report-only (not a gate).
