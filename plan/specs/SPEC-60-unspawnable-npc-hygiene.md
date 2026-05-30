# SPEC-60 — Unspawnable-NPC hygiene check (regression guard for the SPEC-59 class)

**Wave:** Cycle-7 / C7-P0 (safety/quality tooling — generalize the SPEC-59 find). **Risk:** LOW (additive,
pure, warning-only). Reversible.

## Description + Impact
SPEC-59 found a real, sizeable bug: 10 curated NPCs were loaded live but **spawned nowhere** (no
`homeLocationId`, no location `npcSpawns` entry), so a player could never meet them. `content:verify` did not
catch it. This generalizes that find into a permanent guard, exactly parallel to SPEC-53's orphaned-dialogue
warning: `staticPlayabilityCheck` warns on any NPC that **no location can spawn** — i.e. it has neither a
`homeLocationId` nor an entry in any location's `npcSpawns`. Such an NPC is unreachable in play.

It is a **warning, not an error** — the check is pure over whatever registries it is given, and on a subset
load an NPC could legitimately be spawned by a location in a not-yet-loaded pack (advisory severity, matching
the orphan-dialogue + salience-0 warnings). `content:verify` already prints `report.warnings`, so the gate
surfaces it for all packs incl. future AI-generated ones. With SPEC-59 applied, real content has 0
unspawnable NPCs today — the value is as a regression guard against the exact class shipping again.

## Files (in scope)
- `packages/content-loader/src/playability.ts` (add the unspawnable-NPC scan + warning).
- `packages/content-loader/src/playability.test.ts` (planted unspawnable NPC → warning; spawnable → none).

## Out of scope
- Making it an error (subset-load false positives — keep advisory). Reachability of the spawn *location*
  itself (island locations are already caught by the existing reach-target check). Engine/schema change.

## DoD + Acceptance
- [ ] `staticPlayabilityCheck` collects every `npcId` referenced by any location's `npcSpawns`, then for each
      NPC in the registry that has no `homeLocationId` and is not in that set, pushes one `warnings` entry.
- [ ] No `errors` added (warning-only).
- [ ] `playability.test.ts`: an NPC with neither home nor a spawn → its unspawnable warning; an NPC with a
      `homeLocationId` → none; an NPC listed in a location's `npcSpawns` → none. Existing tests green.
- [ ] `pnpm content:verify` stays 0-error and (post-SPEC-59) **0 unspawnable warnings** on the real 7 packs.
- [ ] `pnpm verify` green; test count rises. Golden untouched; audit clean.

## Test strategy
Extend `playability.test.ts` (same builder pattern as the SPEC-53 orphan tests): a pack with an NPC that has
no `homeLocationId` and isn't in any `npcSpawns` → assert the unspawnable warning + `errors` empty; a pack
where the NPC has `homeLocationId` (or a location lists it in `npcSpawns`) → assert no unspawnable warning.
The real `content:verify` over all 7 packs is the integration check (0 unspawnable post-SPEC-59).
