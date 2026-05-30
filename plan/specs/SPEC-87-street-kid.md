# SPEC-87 — "Someone's Brother": a human, non-faction beat (tonal range)

**Wave:** Cycle-9 / C9-P2 (content — tonal range, net-new not parallel). **Risk:** LOW (new pack, additive,
wired live; existing verbs). Reversible.

## Description + Impact
The slice's threads were uniformly hard-boiled crime/factions. This adds a human, NON-faction, NON-combat
beat for tonal range: a child in the Ashfall district (npc.street_kid) whose brother Tomas went into the
warehouse for Varga's people and didn't return. `quest.lost_brother` (offerWhen flag.met_kid) — a single
quiet "search" branch resolved by reaching the warehouse floor, with a restrained show_text payoff (his coat,
no Tomas). Net-new tone (not a parallel of any faction quest), reaching into existing geography.

## Files
- `content/core/pack.street_kid/{pack.json,ink/street_kid.ink}` (new, wired live). `main.ts` + `live-packs.spec.ts`.
- `packages/app-web/test/street-kid.spec.ts`.

## DoD + Acceptance
- [x] npc.street_kid is neutral (no faction) + non-combat; quest.lost_brother offers on met_kid; the search
  branch completes by reaching warehouse_floor (single-branch → SPEC-68 clean; met_kid set by Ink → SPEC-70 clean).
- [x] content:verify 12 quests / 0 warnings; street-kid.spec +2; live-packs lockstep. pnpm verify green (308);
  build + e2e 4 passed; golden untouched; audit clean.
