# SPEC-72 — Playability gate: a defeat objective requires the target to have combat stats

**Wave:** Cycle-8 / C8-P0 (tighten the playability gate). **Risk:** LOW (pure check; ERROR-level — currently
0 violations so verify stays green). Reversible.

## Description + Impact
An audit of `defeat` objectives vs `combat.hp` found the one real defeat (warehouse/force → warehouse_guard,
hp 12) is fine — but the existing `staticPlayabilityCheck.objectiveSatisfiable` only verified the defeat
target NPC *exists*, not that it carries combat stats. A `defeat` on a non-combat NPC is **unwinnable** (the
combat system can't damage an NPC with no hp), yet it would pass solvability. This tightens the gate: (1)
`objectiveSatisfiable`'s `defeat` case now requires `combat !== undefined`; (2) a dedicated per-branch ERROR
fires on any `defeat` objective whose target lacks combat stats (catches a single unwinnable branch even when
the quest has other solvable branches). ERROR (not warning) — `combat.hp` is final per NPC (defined once;
integrity.ts catches a dangling npcId), so it is unambiguous, like the existing unsolvable/island errors.

## Files
- `packages/content-loader/src/playability.ts` (defeat case + per-branch error).
- `packages/content-loader/src/playability.test.ts` (+2).

## DoD + Acceptance
- [x] `defeat` on an existing NON-combat NPC → ERROR (named); on a combat NPC → no error.
- [x] `content:verify` stays 0-error on the real 8 packs (warehouse_guard has hp 12).
- [x] `pnpm verify` green (289 tests); golden untouched; audit clean.
