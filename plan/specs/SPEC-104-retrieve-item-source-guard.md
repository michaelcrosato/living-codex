# SPEC-104 — Playability guard: a `retrieve` objective needs an obtainable item

**Wave:** Cycle-10 P0 (safety-gate completeness) · **Risk:** LOW · **Status:** Todo

## Description + Impact

`staticPlayabilityCheck` (the "schema-valid ≠ playable" gate, SPEC-43) detects the *semantic
unwinnability* of every objective kind **except one**:

| Objective | Unwinnability guard |
|-----------|---------------------|
| `reach` | island-location detection (no exits in/out) |
| `defeat` | target NPC must carry `combat.hp` (SPEC-72) |
| `talk_to` | target NPC must exist (integrity) |
| `skill_check` | `dc ≤ 20` (a nat-20 can always clear) |
| `set_flag` | always satisfiable |
| **`retrieve`** | **only `count > 0` — does NOT check the item is obtainable** |

The engine adds an item to inventory **only** via a `GiveItem` event, sourced from a `give_item`
effect or a quest's `rewards.items` / `rewards.credits` (verified: `world.ts:120` starts inventory
empty; combat drops nothing; `apply.ts` GiveItem is the sole inventory-add path; `quests.ts:25`
`rewardEvents`). Therefore a `retrieve` objective whose `itemId` is granted by **no** `give_item`
effect anywhere and **no** quest reward is **provably unwinnable** — the player can never accumulate
the item (`quests.ts:117` completes `retrieve` when `inventory[itemId] >= count`).

This is the exact bug class the gate exists to catch, and the one the thesis cares about most: a real
model generating content *will* emit `retrieve` objectives, and an unobtainable-item retrieve is real
unplayability the gate currently passes. SPEC-104 is the `retrieve` analog of SPEC-72 — it completes
the unwinnability-detection family so the gate is uniform across all six objective kinds.

## Approach (files / patterns)

`packages/content-loader/src/playability.ts` — add a pass modeled exactly on the SPEC-70 flag
set-vs-read check:

1. Build `obtainableItems: Set<ItemId>` from every item source across the loaded registries:
   - every `give_item` effect's `itemId`, scanning the same effect-bearing locations the existing
     passes already walk: `quest.onAnyComplete`, `branch.onComplete`, `branch.onFail`,
     `skill_check.onFail`, `storylet.effects`;
   - every `quest.rewards.items[].itemId`;
   - `"item.credits"` when any `quest.rewards.credits > 0` (the engine grants credits as the
     `item.credits` inventory entry — `apply.ts` bribe path / WORLD_STATE). Literal, with a comment;
     content-loader must not import engine-core (deps rule).
2. For every `retrieve` objective across all quests whose `itemId ∉ obtainableItems`, push a
   **warning** (not error): on a SUBSET load a not-yet-loaded pack could grant the item via
   `give_item` — identical reasoning to the SPEC-60 unspawnable-NPC and SPEC-70 flag-gate warnings
   (item grants are *extrinsic*/multi-source, unlike `defeat`'s intrinsic `combat.hp` → which is a
   hard error). `content:verify` already surfaces warnings.

Update the JSDoc bullet list at the top of `staticPlayabilityCheck` to document the new guard.

## DoD + acceptance

- [ ] New warning fires for a `retrieve` objective on an item granted by nothing.
- [ ] No warning when the item is granted by a `give_item` effect (test each effect-bearing site:
      branch.onComplete + storylet.effects at minimum) OR by `rewards.items` OR by `rewards.credits`.
- [ ] `pnpm content:verify` reports **0** new warnings on the real packs (today: 0 `retrieve`
      objectives → 0 occurrences; clean regression guard, like SPEC-53/60).
- [ ] `pnpm verify` EXIT 0 (gate commits on the exit code — SPEC-99 lesson, never piped output).
- [ ] golden-master untouched (no pipeline change); `pnpm audit` clean.

## Test strategy

`playability.test.ts` (extend): a `retrieve`-on-unobtainable-item → warning; `give_item`-granted →
no warning (via branch.onComplete and via a storylet effect); `rewards.items`-granted → no warning;
`rewards.credits` + `retrieve item.credits` → no warning. Assert `errors` stays empty in every case
(this guard is warning-only). Reuse the existing `check()`/`quest()`/`pack()` helpers.
