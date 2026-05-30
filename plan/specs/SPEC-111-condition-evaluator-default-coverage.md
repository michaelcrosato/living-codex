# SPEC-111 — Cover the condition evaluator's untested kind + `?? 0` default paths

**Wave:** Cycle-10 P1 (core-logic coverage) · **Risk:** LOW (test-only) · **Status:** Todo

## Description + Impact

`conditions.ts` `evaluate()` is the core gating logic — it powers every quest offer, exit lock,
storylet precondition, and NPC reaction. A coverage pass (branch 77.77%) surfaced genuine gaps the
existing `conditions.test.ts` misses:

1. **`credits_at_least` is entirely untested** — a whole condition kind with zero direct coverage
   (every other kind has a true/false case). `evaluate` line 19-20 reads
   `inventory["item.credits"] ?? 0 >= amount`.
2. **`reputation_at_least`'s `?? 0` default on an unmet faction** is untested and **correctness-relevant**:
   `reputation_at_least(unmetFaction, -5)` must be `true` (`0 >= -5`) — the `?? 0` provides this; without
   it, `undefined >= -5` evaluates `false`, a real bug for non-positive thresholds on a faction the player
   never interacted with. The test only covers a faction *with* reputation.
3. **`has_item`'s `?? 0` default on an absent item** (the `0 >= count` false path) is untested.

These are the `?? 0`-default branches (the 77.77%→ gap) plus the missing kind. The evaluator gates all
gameplay, so pinning them is genuine correctness coverage (the SPEC-44…48 pattern), not number-chasing.

## Approach (files / patterns)

Test-only: `packages/engine-core/src/conditions/conditions.test.ts`. Add cases reusing the existing
`seeded()` World + a fresh `createWorld` for the empty-state defaults. No production change.

## DoD + acceptance

- [ ] `credits_at_least` tested: with credits (boundary met/not) and on an empty inventory (`?? 0`:
      amount 0 → true, amount 1 → false).
- [ ] `reputation_at_least` on an **unmet** faction: value 0 → true, value -5 → true (the `?? 0` default,
      the genuine non-positive-threshold behavior), value 1 → false.
- [ ] `has_item` on an **absent** item: count 1 → false (`?? 0`).
- [ ] `pnpm verify` EXIT 0; branch coverage on conditions.ts rises; golden untouched; `pnpm audit` clean.

## Test strategy

Add the cases above to the `evaluate` describe. Assert exact booleans. The empty-World cases use a fresh
`createWorld` (no factions/items) so the `?? 0` arms execute.
