# SPEC-37 — set_flag quest-objective test (last uncovered objective kind)

- **Status:** Done · **Pillar:** Quality · **Wave:** Cycle-5 P0 · **Cycle:** 5

## Description & impact
After SPEC-36, the only quest objective kind with **zero test coverage** was `set_flag` (the quests.ts:129
survivors `world.flags[objective.flag] === objective.to`). Covering it completes the engine's objective-kind
vocabulary (reach/retrieve/defeat/talk_to/skill_check/set_flag all now tested) — a bounded completeness
milestone, not open-ended mutation-chasing.

## DoD & acceptance
- `quests.test.ts` drives a `set_flag` objective: not resolved while the flag is unset (kills `===`→`!==`),
  resolves + completes the branch once the matching flag is set. +1 test.
- `pnpm verify` green.

## Approach
Additive test in `quests.test.ts` using a `set_flag` objective + `SetFlag` event. No production change.

## Test strategy
The test IS the deliverable; verify green via real execution.
