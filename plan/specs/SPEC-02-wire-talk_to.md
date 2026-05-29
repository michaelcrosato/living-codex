# SPEC-02 — Wire the `talk_to` quest objective

- **Status:** Todo · **Pillar:** Fixes/Hygiene · **Wave:** 1 · **Priority:** P=10
- **I**=3 **F**=4 **R**=2 **Ft**=5

## Description
The `talk_to` objective kind is defined in the schema (`quest.ts`) but its runtime arm is an empty stub:
`packages/engine-core/src/systems/quests.ts:146-148` ("Completed via a dialogue flag once narrative (T-07)
lands; unused by the slice."). T-07 narrative has since landed, so this is now a closable gap — a quest can
declare `talk_to npc.X` but the objective never completes. Wire it deterministically and replay-safely.

## Acceptance Criteria
- A quest branch whose current objective is `{ kind:"talk_to", npcId }` **completes that objective** once the
  player has talked to that NPC, and does **not** complete it otherwise.
- Resolution is **deterministic and replay-stable** (`hash(replay)==hash(live)` still holds): it reads only
  `World` (and, if needed, registries passed into the system) — no new entropy, no `Date.now`.
- **Prefer no new `World` field.** If the chosen signal requires one (e.g. a `talkedTo` set), bump
  `WORLD_VERSION`, add a `tools/migrate` step **and** a migration test (Recipe 5), and document it in
  WORLD_STATE §1 (coordinate with SPEC-01 if both touch that section).
- Colocated test in `systems/quests.test.ts` (or a new `talk_to`-focused case) proves: not-talked → not done;
  talked → done; replay of the session reproduces identical hash.
- `pnpm verify` green. Golden-master only changes if the schema changes (it shouldn't here).

## Implementation approach (confirm by reading the 3 files first)
Read `systems/quests.ts`, `systems/dialogue.ts`, `systems/interaction.ts` to find the existing "player talked
to NPC" signal. The dialogue system mirrors declared Ink vars into `World.flags` and stores Ink state under
`World.dialogue[dialogueId]`; interaction emits `Interacted{entityId, dialogueId}`. **Lowest-surface option:**
give `questSystem` read access to the npc registry (it already receives `quests`; `session.ts` builds systems
with registries in scope) so it can map `npcId → npc.dialogueId` and mark `talk_to` done when
`world.dialogue[that dialogueId]` exists (i.e. the conversation was engaged). Pick the option that needs no
World migration if it satisfies the ACs; only add a World field if no existing signal suffices.

## Files
- `packages/engine-core/src/systems/quests.ts` (+ its `.test.ts`). Possibly `session.ts` (pass `npcs` to
  `questSystem`). Possibly (only if a World field is required) `state/world.ts`, `events/event.ts`,
  `events/apply.ts`, `tools/migrate/src/world.ts` (+ test), `docs/WORLD_STATE.md`.

## Dependencies / prereqs
None hard. If it touches schema/World, it shares files with SPEC-01/SPEC-11/SPEC-16 — sequence accordingly.

## Test strategy
Unit: a small quest with a single `talk_to` branch; step a headless session that talks vs doesn't; assert
objective state + completion. Replay: drive it, replay the log, assert hash equality. Run `pnpm replay:verify`.

## Effort
S–M (S if an existing signal works; M if a World migration is needed).

## Out of scope
Redesigning dialogue; adding new objective kinds; UI changes. If `talk_to` reveals a need for a "talked to
anyone in faction" verb etc., that's BACKLOG.
