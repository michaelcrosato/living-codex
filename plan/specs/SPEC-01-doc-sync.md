# SPEC-01 — Doc-sync: SCHEMA.md & WORLD_STATE.md catch up to code

- **Status:** Todo · **Pillar:** Fixes/Hygiene · **Wave:** 0 · **Priority:** P=11
- **I**=2 **F**=5 **R**=1 **Ft**=5

## Description
The treaty docs drifted behind the code (verified 2026-05-29). The docs are the agent's primary map
(GOAL §8 read-order), so drift directly costs future-agent confidence. Three concrete gaps:
1. **`docs/SCHEMA.md §5`** (Effects) lists 8 effects but `packages/content-schema/src/effect.ts` has **9** —
   it is missing **`bribe_faction`** (`{ kind:"bribe_faction", factionId, cost:int>0, standing:int }`, added T-16).
2. **`docs/SCHEMA.md §7`** (Conditions) is missing **`credits_at_least`** (`{ kind:"credits_at_least", amount:int≥0 }`),
   which exists in `condition.ts` and is used by the bribe demo.
3. **`docs/WORLD_STATE.md §1`** shows the `World` interface **without** the v2 fields
   `npcDialogue: Record<string,DialogueId>` and `unlockedExits: Record<string,boolean>`, and without noting
   `WORLD_VERSION = 2`. `world.ts` has both.

## Acceptance Criteria
- `SCHEMA.md §5` Effect union documents `bribe_faction` with the exact shape & bounds-note (cost spent only
  if affordable; clamp lives in `applyEvent`), matching `effect.ts`.
- `SCHEMA.md §7` Condition union documents `credits_at_least` matching `condition.ts`; the prose "adding a
  condition kind is one schema entry + one switch arm + one test" stays true.
- `WORLD_STATE.md §1` `World` includes `npcDialogue` and `unlockedExits` with one-line comments, and a note
  that `version` is currently `2` (added for reactions/`set_npc_dialogue`/`unlock_exit`).
- No code changes. `pnpm verify` remains green (docs are not in the gate, but must not be broken).
- Cross-check: no *other* effect/condition/World field is still undocumented (grep the unions vs the docs).

## Implementation approach
Read `effect.ts`, `condition.ts`, `world.ts`; edit the three doc sections to match verbatim shapes. Keep the
docs' existing voice/format. Add bribe_faction next to the §5 "extending the vocabulary" note (it's the worked
example of that note). Add credits_at_least after `has_item` in §7. In WORLD_STATE §1, mirror the real
interface field order.

## Files
- `docs/SCHEMA.md`, `docs/WORLD_STATE.md` (edits). Read-only: `packages/content-schema/src/effect.ts`,
  `…/condition.ts`, `packages/engine-core/src/state/world.ts`.

## Dependencies / prereqs
None. Pure docs. Good warm-up / first commit.

## Test strategy
No automated test (docs not gated). Manual diff: every `kind` in the two Zod unions appears in the doc; every
`World` field appears in §1. Run `pnpm verify` to confirm nothing regressed.

## Effort
XS (~20 min).

## Out of scope
Any schema/code change; rewriting the docs' structure; touching CONTENT_PIPELINE/GOAL/ARCHITECTURE (already
current for assertions). If you find *further* drift, note it in PROGRESS/BACKLOG — don't expand this spec.
