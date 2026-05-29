# SPEC-11 — Storylet / salience selection layer (additive content vocabulary)

- **Status:** Todo · **Pillar:** Player Experience / Content model · **Wave:** 3 · **Priority:** P=8
- **I**=5 **F**=2 **R**=3 **Ft**=4 · **Largest surface — write the design note first.**

## Description
The 2026-aligned content model for a data-driven RPG is the **storylet / quality-based-narrative (QBN)**
pattern: a unit of content = `content` + `preconditions` + `effects`, with a selector that picks the
most-relevant *available* unit. This generalizes "reactive NPCs" and "which line fires" into pure data + a pure
selector, all replay-safe. (Research: [storylets](https://mkremins.github.io/publications/Storylets_SketchingAMap.pdf),
[emshort salience/QBN](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/).)
It is high-impact but the **biggest surface in this plan** — so it ships in a low-risk first slice.

## Required first step — design note (in this file's "Design" section, before coding)
Decide and record:
1. **Storylet shape** — minimal additive schema, e.g. `Storylet = { id, preconditions: Condition[], salience?:
   number, tags?: string[], content: { dialogueId?: DialogueId, ambient?: string }, effects?: Effect[] }`, added
   to `ContentPack` as optional `storylets: Storylet[]` (engine-ignored unless a system consumes them).
2. **Selection algorithm (MUST be deterministic & replay-safe):** filter to storylets whose `preconditions`
   hold; rank by salience/tag-match; break ties using the **single seeded RNG _inside_ the applyEvent fold**
   (never `Math.random`), exactly like skill checks — so selection replays identically.
3. **First slice = lowest risk:** **salience-selected ambient/barks** (choosing which ambient line a location/NPC
   shows from world state) — additive, no quest-flow change. *Defer* "storylets gate Ink knots" and "storylets
   drive quests" to BACKLOG until the model is proven.
4. **Migration:** additive optional field → no `World` change; `ContentPack` gains an optional array (older packs
   omit it). Confirm whether the pack format version needs a bump; if so, add a `tools/migrate` step + test (Recipe 5).

## Acceptance Criteria (first slice)
- `ContentPack` gains optional `storylets` (Zod, additive, defaulted `[]`); referential integrity validates any
  `dialogueId` refs; the engine ignores storylets unless the new selector system consumes them.
- A **pure** `storyletSystem`/selector in `engine-core/src/systems/` selects an available storylet deterministically
  and emits an event (e.g. `ShowText`/an ambient event) via the normal event→apply path — **no `World` mutation**,
  **no new entropy except the existing seeded RNG inside the fold**.
- Replay holds: `hash(replay)==hash(live)` for a session that triggers storylet selection (colocated test).
- A small content example (in a fixture or `pack.opening`) demonstrates salience selection; `content:validate` +
  `content:verify` pass; the canon graph is unaffected (storylets aren't canon assertions).
- `pnpm verify` green. **Golden-master updates deliberately** (ContentPack schema changed) — note it.

## Implementation approach
Sequence **after SPEC-16 (Zod 4) if both are pursued** (avoid double schema churn — HARD ordering). Read SCHEMA
§7 (conditions), `conditions/conditions.ts` (`evaluate`), `systems/reactions.ts` (closest existing pattern —
condition-driven overrides), `systems/quests.ts` (RNG-inside-fold pattern), and `events/apply.ts`. Add the schema
file `content-schema/src/storylet.ts` + export; add `systems/storylet.ts` + test; register it in the tick order
in `session.ts`. Reuse `evaluateAll` for preconditions.

## Files
- `packages/content-schema/src/storylet.ts` (+ `pack.ts` wiring, `index.ts`), `packages/content-loader/src/integrity.ts`
  (ref check), `packages/engine-core/src/systems/storylet.ts` (+ `.test.ts`), `packages/app-web/src/session.ts`
  (register), a content fixture, `docs/SCHEMA.md`. **Collision:** schema + golden with SPEC-16/SPEC-02/SPEC-13.

## Dependencies / prereqs
**HARD soft-ordering:** do SPEC-16 first if doing both. Reuses conditions + the RNG-in-fold determinism pattern.

## Test strategy
Unit: selector picks the highest-salience available storylet; ties resolve via seeded RNG (deterministic across
runs); precondition-gated storylets stay hidden. Replay: a session that fires storylets replays to an identical
hash. Content: the example validates + verifies.

## Effort
L (~1 day incl. design note). The riskiest/biggest spec — slice it.

## Out of scope (→ BACKLOG)
Storylets gating Ink knots; storylets driving full quests; the **unified qualities vector** (collapsing
flags/skills/rep into one numeric space) — that's a separate cross-cutting redesign; drama-manager waypoint steering.
