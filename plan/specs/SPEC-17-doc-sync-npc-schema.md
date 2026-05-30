# SPEC-17 — Doc-sync SCHEMA §3 (NPC) + drift sweep

- **Status:** Todo · **Pillar:** Fixes/Hygiene · **Wave:** 5 · **Priority:** P=11
- **I**=2 **F**=5 **R**=1 **Ft**=5 · **LOW risk — docs only, no code/test change.**

## Description
`docs/SCHEMA.md §3` documents the `Npc` shape **without** two additive fields that exist in
`packages/content-schema/src/npc.ts` and ship in real content:
- `combat: z.object({ hp: z.number().int().positive() }).optional()` (npc.ts:27) — present on NPCs
  that can be the target of a `defeat` objective (used by `content/core/pack.kestrel`).
- `homeLocationId: LocationId.optional()` (npc.ts:31) — decouples NPC placement from the location def.

This is the same drift class SPEC-01 fixed for §5/§7 + WORLD_STATE §1. Docs are the agent's map
(GOAL §8); stale docs mislead the next agent into thinking a field doesn't exist. Found 2026-05-29
while authoring `pack.kestrel` (BACKLOG entry "Doc-sync SCHEMA §3 (NPC)").

## Acceptance Criteria
- `docs/SCHEMA.md §3` NPC code block mirrors `npc.ts` exactly: includes `combat` and `homeLocationId`
  with one-line rationale comments matching the code.
- **Drift sweep (record what was checked):** confirm SCHEMA documents (a) the `Storylet` shape (SPEC-11)
  and `ContentPack.storylets` (§8), and (b) `CanonAssertion`/`assertions` (S5). If any is undocumented,
  add a short subsection or note. List each section checked in the spec Notes + PROGRESS.
- Docs-only: **no** change to any `.ts` schema/code/test. `pnpm verify` still green (run it to confirm
  nothing unrelated regressed — docs don't gate, but the baseline must stay clean).
- The BACKLOG "Doc-sync SCHEMA §3 (NPC)" item is marked resolved (moved to "Resolved" line).

## Implementation approach
Edit `docs/SCHEMA.md §3` to match `packages/content-schema/src/npc.ts`. `grep -in "storylet\|assertion"
docs/SCHEMA.md` to confirm §8/§ coverage; add a one-paragraph subsection if missing. No Recipe — this is
pure documentation hygiene.

## Files
- `docs/SCHEMA.md` (§3 NPC, possibly §8 ContentPack / a storylet+assertion note).
- `plan/BACKLOG.md` (mark the NPC doc-sync item resolved). **No collision** with any code spec.

## Dependencies / prereqs
None. Independent; safe to run first / in parallel with any other spec (touches only docs).

## Test strategy
None (documentation). DoD check = `pnpm verify` green + a manual read confirming §3 matches `npc.ts`.

## Effort
S (<1h).

## Out of scope
Any code/schema/test change; reformatting unrelated SCHEMA sections; documenting fields that don't exist.
