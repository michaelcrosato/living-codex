# SPEC-23 — `skill_at_least` condition (skill-gated / passive checks)

- **Status:** Todo · **Pillar:** Experience / Fixes · **Wave:** 8 · **Priority:** P=11
- **I**=4 **F**=4 **R**=2 **Ft**=5 · **LOW-MED risk — additive schema verb (Recipe 5). After SPEC-16.**

## Description
The condition language (`packages/content-schema/src/condition.ts`) can gate on `flag_is`,
`reputation_at_least`, `has_item`, `quest_completed`, `credits_at_least`, and `not/all/any` — but it
**cannot query the player's skills** (`persuade/sneak/force/tech`), even though skills are core engine
state (`World.player.skills`, driven by combat/skillchecks). This blocks the **passive check** pattern —
an exit/quest-offer/storylet/dialogue branch visible only when a skill meets a threshold — which is a
proven, deterministic narrative device (research: Disco Elysium passive checks; "stat-threshold visibility").
Add a `skill_at_least` condition kind. Pure, total, additive: one schema entry + one evaluator arm + one
test (SCHEMA §7 recipe / `docs/agent-guides/evolving-the-schema.md`).

## Acceptance Criteria
- **Schema:** `condition.ts` gains `{ kind: "skill_at_least"; skill: SkillName; value: number }` in both
  the `Condition` TS union and the `z.discriminatedUnion`. `value` is `z.number().int()`.
  - **Skill-name single source of truth:** content-schema cannot import `engine-core` (deps rule), and
    engine-core's `SkillId` (`world.ts`) is the existing list. Resolve cleanly: define a `SkillName`
    enum **in content-schema** (`z.enum(["persuade","sneak","force","tech"])`) and make engine-core's
    `SkillId` derive from / stay aligned with it (engine-core already depends on content-schema). Document
    the chosen direction in the spec Notes; keep the two lists provably identical (a colocated assertion).
- **Engine:** `engine-core/src/conditions/conditions.ts` gains the `skill_at_least` arm →
  `(world.player.skills[c.skill] ?? 0) >= c.value`. The exhaustive `switch` still compiles (the `never`
  guard proves totality — that's the test that this is wired everywhere).
- **Tests:** colocated cases in `conditions.test.ts` — true at/above threshold, false below, nested under
  `all/any/not`. The **replay invariant is unaffected** (conditions are read-only over `World`).
- `pnpm content:validate` + `pnpm content:verify` pass. Golden-master **unchanged** (no generated pack
  emits this kind yet — confirm it stays byte-stable).
- `docs/SCHEMA.md §7` documents the new kind. Full **`pnpm verify` green**.

## Implementation approach
Recipe 5 (evolving-the-schema): add the `SkillName` enum + union arm in content-schema; add the evaluator
arm in engine-core; add tests; update SCHEMA §7. Verify the `never` exhaustiveness guard forces the arm.
Keep it engine-ignored-safe everywhere it isn't explicitly handled.

## Files
- `packages/content-schema/src/condition.ts` (+ a `SkillName` enum, possibly in `ids.ts` or a new
  `skill.ts`), `packages/engine-core/src/conditions/conditions.ts` + `conditions.test.ts`,
  `packages/engine-core/src/state/world.ts` (align `SkillId` to `SkillName`), `docs/SCHEMA.md §7`.
  **Collision:** schema layer + golden-master — **run after SPEC-16; do NOT run concurrently with SPEC-26.**

## Dependencies / prereqs
**HARD: after SPEC-16 (Zod 4)** — it touches every schema file; doing this verb first would force a
re-port. No network.

## Test strategy
`conditions.test.ts` new cases + the exhaustiveness compile-check + `replay.test.ts` unaffected +
`content:validate`/`content:verify` + golden-master byte-stable. Then `pnpm verify`.

## Effort
M.

## Out of scope
**Active** (dice-rolled) skill checks — those already exist in the skillcheck/combat path; this is the
*passive/visibility* gate only. UI surfacing of passive checks (a follow-up content/app spec, e.g. greying
an option). Changing how skills are raised. A "unified quality vector" redesign (BACKLOG — and now
contraindicated; see BACKLOG note on segmented qualities).
