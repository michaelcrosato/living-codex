# SPEC-36 — Multi-objective quest-completion invariant test (mutation-targeted)

- **Status:** Done · **Pillar:** Quality · **Wave:** Cycle-5 P0 · **Cycle:** 5

## Description & impact
`quests.ts` mutation score 65.35% (20 survived / 15 no-coverage) — the largest real-survivor surface.
Investigation: `quests.test.ts` only exercised **single-objective** branches with `skill_check`/`defeat`/
`talk_to`. **Zero coverage** for the `reach` + `retrieve` objective kinds, the `>= count` retrieve threshold,
and — most importantly — **multi-objective completion** (`b.objectives.every(...done)`, quests.ts:82) + the
ordered one-objective-per-tick advance. A mutant flipping `every`→`some` would let a branch complete with
1-of-N objectives done — a real correctness bug, currently undetected. This adds one high-leverage test.

## DoD & acceptance
- A `quests.test.ts` case drives a 2-objective branch (`reach` → `retrieve` count 2) and asserts: neither
  resolves early; reaching the hub marks objective 0 only; the branch **stays active with 1/2 done** (kills
  `every`→`some`); exactly 1 gadget is still short of `count:2` (guards `>=`); the 2nd gadget completes it.
- `pnpm verify` green; quests.ts mutation score **rises** vs the 65.35% baseline (measured via scoped
  `pnpm exec stryker run --mutate packages/engine-core/src/systems/quests.ts`).

## Approach
`packages/engine-core/src/systems/quests.test.ts` — additive test using `reach`/`retrieve` objectives +
`EnterLocation`/`GiveItem` events. No production change. Genuine survivors only (zero-coverage paths), not
equivalent-mutant chasing.

## Test strategy
The test IS the deliverable; re-run the scoped mutation to confirm the score improved (anti-homework: real
execution, not belief).
