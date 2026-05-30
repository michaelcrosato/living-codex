# SPEC-59 — Place the generated Drip patrons in the world (reachability)

**Wave:** Cycle-7 / C7-P0 (reachability — the biggest authored-but-unreachable gap found). **Risk:** LOW
(adds `homeLocationId` to 10 NPCs in a curated on-disk pack; the spawn logic already scatters home NPCs;
no engine/schema change). Reversible.

## Description + Impact
Audit finding: **all 10 NPCs in `pack.the_drip_patrons`** (the generated cast — bartender, rumor-monger,
Pell/Wren/Bex/Sull/Yi/Halo/Grin, the Archivist) have **neither a `homeLocationId` nor an `npcSpawns` entry in
any location**. The spawn logic (`session.ts` `spawnNpcsAt`) places an NPC only via a location's `npcSpawns`
or when `npc.homeLocationId === locationId` — so these 10 spawn **nowhere**. The pack is loaded live
(`main.ts`) and fully curated/approved (`provenance.curatedBy: operator`, `approvedAt`), yet a player who
walks into the Drip finds an **empty bar**. `generated-content.spec` only proves they *load* and their
dialogue *plays* (via direct `InkNarrative`) — never that they're *placed* (the same blind spot SPEC-51 found
for the kestrel pack). This is the largest reachability gap in the repo (10 NPCs).

`location.the_drip` (the bar, reachable from the hub, bounds 400×300) currently has an empty `npcSpawns`. The
fix sets `homeLocationId: "location.the_drip"` on each patron; the existing spawn loop then scatters them
deterministically in-bounds (`x = 40 + (i*53)%320 ≤ 359`, `y = 40 + (i*37)%200 ≤ 239`). One field per NPC,
no positions to hand-author, no engine change — and it populates the previously-empty bar with its own cast.

## Files (in scope)
- `content/generated/pack.the_drip_patrons/pack.json` (add `homeLocationId: "location.the_drip"` to the 10 NPCs).
- `packages/app-web/test/generated-content.spec.ts` (add a placement test: a session at the_drip spawns all 10).

## Out of scope
- Re-running the pipeline to emit `homeLocationId` (the pipeline is StubProvider/offline; the on-disk curated
  pack is the source of truth for loaded content — fixing it here is the scoped, byte-stable fix; the
  golden-master `cycle.test.ts` is unaffected). Any change to the patrons' dialogues/quests. Any engine change.
- Distributing patrons across multiple locations (they are the Drip's clientele — one bar; GOAL §3, no speculation).

## DoD + Acceptance
- [ ] All 10 patrons gain `homeLocationId: "location.the_drip"`.
- [ ] `pnpm content:validate` / `content:verify` OK (the location exists in pack.opening; canon-consistent;
      no orphan/island warnings).
- [ ] `generated-content.spec.ts`: a `GameSession` started at `location.the_drip` over `[opening, patrons]`
      has all 10 patron entities (`entity.npc.<id>`) present, `alive`, with `locationId === location.the_drip`,
      scattered within bounds. Existing load/dialogue cases stay green.
- [ ] `pnpm verify` green; production build green; `pnpm e2e` 4 passed; pipeline golden-master untouched; audit clean.

## Test strategy
Construct `new GameSession(registries, fingerprint, InkNarrative, { startLocationId: location.the_drip, … })`
(the constructor spawns the start location's NPCs) and assert each `world.entities["entity.npc.<patron>"]`
exists with `locationId === "location.the_drip"`, `alive === true`, and `pos` within `{w:400,h:300}`. This is
a live-spawn integration test (complements the existing load+dialogue tests) proving the patrons are reachable.
