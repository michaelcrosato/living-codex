# SPEC-35 — Make the Drip Market reachable in the live app

- **Status:** Todo · **Pillar:** Player Experience · **Wave:** Cycle-4 P2 · **Cycle:** 4

## Description & impact
SPEC-33 shipped `pack.drip_market` (validated, tested, playable-when-entered) but it isn't reachable in the
running app (no exit from the opening district, and `main.ts` doesn't load it). Wire it in so a player can
walk into the district and meet its 3 NPCs / hit its storylets — real, curated content the player experiences
(the thesis). Reachability core only; the quest-offer trigger (`flag.met_marrow`) is a follow-up (BACKLOG).

## DoD & acceptance
- `content/core/pack.opening/pack.json`: add an **ungated** exit on `location.ashfall_district`
  (`requires: []`) → `location.drip_market` (with `spawnAt`).
- `packages/app-web/src/main.ts`: load `pack.drip_market` in `loadPacks([...])`.
- `pnpm content:validate` + `pnpm content:verify` green (drip_market now `enterable`; no island).
- **No regression:** `replay-fuzz.spec.ts` (loads `pack.opening` alone, fuzzes `UseExit`) stays green —
  `UseExit` is proximity-gated and emits a deterministic `EnterLocation`, so an unloaded target is harmless.
- A test asserts the new exit exists on `ashfall_district` and targets `location.drip_market`.
- Full `pnpm verify` green. Golden-master untouched (hand-authored content).

## Approach
Locate `ashfall_district` in `pack.opening/pack.json`, append an exit. Add the import + loadPacks entry in
`main.ts`. Add a small assertion to an existing app-web spec (or `drip-market.spec.ts`). No Ink recompile
(no dialogue change).

## Test strategy
`content:validate`/`content:verify`; the exit-existence assertion; confirm `replay-fuzz` + full `pnpm verify`
green (determinism preserved).

## Out of scope (→ BACKLOG)
The `flag.met_marrow` quest-offer trigger (needs an Ink var→flag mirror in `drip_vendor.ink` + recompile);
deeper rendering of the new location's art.
