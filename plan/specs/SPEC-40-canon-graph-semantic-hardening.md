# SPEC-40 — Harden the canon-graph semantic-contradiction test suite

- **Status:** Done · **Pillar:** Quality / Safety · **Wave:** Cycle-6 P0 (REPLENISH frontier) · **Cycle:** 6

## Description & impact
After SPEC-39 covered the *referential* safety layer (`integrity.ts`), the **other** safety-critical
content-loader file — `canon-graph.ts`, the *semantic* contradiction detector (CONTENT_PIPELINE.md §6:
dead-but-placed, allies-who-are-enemies, broke-yet-funding) — measured **53.42%** mutation (52 survivors).
The existing 12 tests cover the rules' headline cases but leave genuine *behavioral* arms unguarded:
- `exclusive-status` was only tested on the **life** group (alive/dead); the **solvency** group
  (broke/solvent/wealthy) arm of `STATUS_GROUP` was untested — a regression could let "broke AND wealthy
  in one epoch" load silently.
- "placement ⟹ alive" was tested only via `homeLocationId`; the parallel **`npcSpawns`⟹alive** derivation
  arm (a dead NPC physically spawned into a location) was unguarded.
- `serializeAssertion` (the human-facing canon report) tested 4 of 7 predicate arms; **enemy_of / funds /
  located_in** were unrendered by any test.
- `findDanglingAssertionRefs` tested only the **npc** arm of `refExists`; the other *reachable* arms
  (faction via `funds`, location via `located_in`) were unguarded. (item/quest arms are unreachable — no
  assertion predicate references them — so deliberately not chased.)

## DoD & acceptance
- `canon-graph.test.ts` gains 4 tests: solvency `exclusive-status`; `npcSpawns`⟹alive dead-NPC catch;
  `serializeAssertion` enemy_of/funds/located_in; per-kind dangling assertion refs (faction/location).
- All assert real behavior (rule name / subjects / rendered string / flagged ghost id); `pnpm verify` green.
- canon-graph.ts mutation score **rises materially** from 53.42% (scoped re-mutation).

## Approach
Additive tests only — `canon-graph.ts` is correct; the gap was coverage. Built from `assertingPack()` /
`ContentPack.parse` fixtures, one targeted behavior per test. No production change.

## Test strategy
Real execution (`findCanonContradictions` / `serializeAssertion` / `findDanglingAssertionRefs`); re-run
`pnpm exec stryker run --mutate .../canon-graph.ts` to confirm the jump. Mutation report-only (not a gate).
