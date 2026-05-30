# SPEC-105 — Playability guard: a `has_item` gate needs an obtainable item

**Wave:** Cycle-10 P0 (safety-gate completeness) · **Risk:** LOW · **Status:** Todo

## Description + Impact

SPEC-70 guards the *condition* surface for flags: a `flag_is` gate reading a flag that nothing sets is
unsatisfiable — the content behind it can never trigger. SPEC-104 just closed the *objective* surface
for items (`retrieve` on an unobtainable item). The remaining hole is the **condition surface for
items**: a `has_item` gate (`condition.ts:13`) reading an item that no `give_item` effect / quest
reward ever grants is the exact item-analog of the SPEC-70 flag gate — content behind it can never
trigger (the player can never hold the item; items enter inventory only via GiveItem — see SPEC-104).

`has_item` gates appear in the same four places SPEC-70 walks for `flag_is`: `quest.offerWhen`,
`storylet.preconditions`, `location.exits[].requires`, `npc.reactsTo[].when` (recursing `not`/`all`/
`any`). With this guard the item-unobtainability check becomes **uniform across both surfaces**
(objectives via SPEC-104, conditions via SPEC-105) — exactly as flag-set detection already covers both
`set_flag` effects and `flag_is` gates.

Real content: `storylet.field_kit_ready` gates on `has_item item.field_kit`, which IS granted by a
`give_item` effect in `quest.clinic_training` — so the guard must stay clean (0 warnings) on the real
packs.

## Approach (files / patterns)

`packages/content-loader/src/playability.ts` — extend the SPEC-104 item block (which already builds
`obtainableItems`): add a `noteConditionItems(cond)` collector (recursing `not`/`all`/`any`, parallel
to the existing `noteConditionFlags`) that records every `has_item` itemId, walk the four gate sites,
and **warn** for any read item ∉ `obtainableItems`. Warning-level (extrinsic/subset-safe, identical
reasoning to SPEC-70/104). Update the `staticPlayabilityCheck` JSDoc bullet list.

## DoD + acceptance

- [ ] Warning fires for a `has_item` gate on an item granted by nothing (test at ≥1 gate site, plus a
      nested `all`/`not` to prove recursion).
- [ ] No warning when the gated item is granted by a `give_item` effect or a quest reward.
- [ ] `pnpm content:verify` reports **0** new warnings on the real packs (field_kit is granted).
- [ ] `pnpm verify` EXIT 0 (gate on the exit code — SPEC-99).
- [ ] golden-master untouched; `pnpm audit` clean.

## Test strategy

`playability.test.ts` (extend the SPEC-104 describe or add a sibling): `has_item`-on-unobtainable in a
storylet precondition → warning; the same item granted via `give_item` → no warning; a nested
`all:[has_item …]` in `offerWhen` → warning (recursion). Assert `errors` stays empty (warning-only).
