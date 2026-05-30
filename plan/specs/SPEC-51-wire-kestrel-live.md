# SPEC-51 — Make the curated rival-fixer pack reachable in the live app

**Wave:** Cycle-7 / C7-P0 (unblocked product depth). **Risk:** LOW (one `main.ts` import + array entry + a
regression test). Reversible.

## Description + Impact
`pack.kestrel` (SPEC-13, "The Rival Fixer" — Kestrel + `faction.kestrel_outfit` + a 3-branch intro quest +
real Ink) is hand-curated, fully tested (`rival-fixer.spec.ts`), and **provenance-curated**
(`curatedBy: michael.crosato`, `approvedAt`) — but it is **not** in `main.ts`'s live `loadPacks([...])` set.
So a player can never reach it: authored, approved content that ships in the repo but not in the game.

This wires it into the live composition root (the `drip_market`/`syndicate_offer` precedent), making Kestrel
appear at `location.ashfall_district` (the hub, already reachable) and her `quest.rival_offer` offer once the
player has met Varga (`flag.met_varga`, set on the cold-open path). Pure product value: existing, approved
content becomes playable. No engine/schema/content change — only the wiring.

**Also adds a regression guard** the repo currently lacks: `main.ts` boots a *subset* of the on-disk packs
(`content:validate` only ever loads the *superset* of all packs). Per the SPEC-35/SPEC-42 layering trap, a
subset can harbor a dangling cross-pack ref the superset masks. A test that loads **exactly the live boot
set** through `loadPacks` and asserts it resolves protects the live boot from that failure mode.

## Out of scope
- `pack.bribe_demo` — self-titled "the T-16 extensibility demo", no NPC face, and **uncurated** (its
  `provenance` has no `curatedBy`/`approvedAt`). It is a recipe demonstration of the `bribe_faction` verb,
  not shipped narrative content; leave it out of the live set deliberately.
- Any change to `pack.kestrel` itself, the engine, schema, or loader.

## Files (in scope)
- `packages/app-web/src/main.ts` (one import + one array entry).
- `packages/app-web/test/live-packs.spec.ts` (new; live-boot-set load guard).

## DoD + Acceptance
- [ ] `main.ts` `loadPacks([...])` includes `kestrel` (and the existing 5); `pack.bribe_demo` intentionally excluded.
- [ ] New `live-packs.spec.ts`: imports the SAME pack JSONs `main.ts` imports, loads them through the real
      `loadPacks`, asserts no throw, and asserts a signature entity from EACH live pack resolves in the one
      registry (incl. `npc.kestrel` + `quest.rival_offer`). Asserts `pack.bribe_demo`'s quest is **absent**
      (documents the deliberate exclusion).
- [ ] `pnpm verify` green; test count rises.
- [ ] Production build green; `pnpm e2e` 4 passed (the live boot still works with kestrel added).
- [ ] Golden-master untouched; `pnpm audit` clean.

## Test strategy
`live-packs.spec.ts` mirrors `main.ts`'s import list exactly (so it fails if the live set drifts into a
subset-integrity break), runs `loadPacks`, and checks one signature id per pack — a direct, durable guard on
what the app actually boots. e2e additionally proves the real app boots and the cold-open slice still plays.
