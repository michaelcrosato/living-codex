# SPEC-39 — Harden the content-loader treaty-enforcement test suite

- **Status:** Done · **Pillar:** Quality / Safety · **Wave:** Cycle-6 P0 (REPLENISH frontier) · **Cycle:** 6

## Description & impact
REPLENISH re-audit found the highest-value untested surface: **content-loader `integrity.ts`** — the
referential-integrity pass that makes the core thesis true ("AI-authored content can never silently break
the game"). Scope-mutation revealed it at **19.70%** (46 survivors): `load.test.ts` only verified dangling-ref
detection for **npc** (`giverNpcId`) + **quest** (a nested condition), leaving the other ref types/paths
(faction, item, location, dialogue across effects/objectives/exits/npcSpawns/factions/rewards) **unguarded** —
a regression in any arm could let invalid content load undetected. This hardens the safety boundary.

## DoD & acceptance
- `load.test.ts` gains: (1) a per-TYPE dangling-ref test (faction/item/location/dialogue each caught), (2) an
  effect-routed ref test (`give_item`), (3) a table-driven per-PATH test (condition `has_item`, effect
  `adjust_reputation`, objective `reach`, exit `toLocationId`, `npcSpawns`, `faction.rivals`).
- All cases throw with the offending dangling id (real execution); `pnpm verify` green.
- integrity.ts mutation score **rises substantially** from 19.70% (measured via scoped re-mutation).

## Approach
Additive tests in `packages/content-loader/src/load.test.ts` built from `validPack()` variations (one
dangling ref per case). No production change — integrity.ts already catches these; the gap was coverage.

## Test strategy
Real execution (loadPacks throws); re-run `pnpm exec stryker run --mutate .../integrity.ts` to confirm the
score jump. Mutation report-only (not a gate).
