# SPEC-25 — `content:verify` coverage for storylets

- **Status:** Todo · **Pillar:** Quality · **Wave:** 8 · **Priority:** P=10
- **I**=3 **F**=4 **R**=2 **Ft**=5 · **LOW-MED risk — offline verifier only; engine-core untouched.**

## Description
`pnpm content:verify` (`tools/scripts/content-verify.ts`) proves quests are **solvable & reachable**,
exits are in range, gates aren't contradictory, and the canon assertion graph is consistent — but it
**does not reason about storylets at all**. Once storylets ship as content (SPEC-24) and the pipeline
emits them (SPEC-26), an unchecked storylet can be **silently dead**: a `content.dialogueId` that doesn't
resolve, preconditions referencing a missing flag/faction/item/quest, or preconditions that are
**statically unsatisfiable** (so the storylet can never fire). Extend the offline verifier to catch these.

## Acceptance Criteria
- `content:verify` gains storylet checks (offline, deterministic, no engine change):
  - **(a) Reference integrity:** every storylet `content.dialogueId` resolves to a loaded `DialogueAsset`;
    every id inside `preconditions`/`effects` references a real flag/faction/item/quest (reuse the existing
    condition/effect reference walker from `content-loader/src/integrity.ts`).
  - **(b) Static unsatisfiability heuristic:** flag storylets whose preconditions can **never** hold —
    e.g. an `all` containing both a condition and its `not`, or two mutually-exclusive `flag_is` equals on
    the same flag. Heuristic, **not** a full SAT solver; **document the limits** in the script + a doc note.
  - **(c) Hygiene warning (non-fatal):** a storylet with **no preconditions AND salience 0** (always-on
    noise) prints a warning.
- Runs inside `pnpm content:verify` (thus `pnpm verify`); **all existing content passes**.
- A **planted bad-storylet fixture** proves each check fires (unresolved dialogueId, dangling ref,
  unsatisfiable `all`); remove/guard the fixture so the committed suite is green.
- Output stays deterministic and human-readable (matches the current `[content:verify] OK — …` style).

## Implementation approach
Extend `content-verify.ts`; lift/reuse the reference-walking helper in `content-loader/src/integrity.ts`
(add a small exported helper if needed, with its own test). Implement the unsatisfiability heuristic as a
pure function over `Condition` with a colocated unit test (good + planted-bad cases). Keep it offline.

## Files
- `tools/scripts/content-verify.ts`, likely `packages/content-loader/src/integrity.ts` (+ `*.test.ts`),
  a `docs/SCHEMA.md §7` or `docs/CONTENT_PIPELINE.md` note on the heuristic's limits. **No engine
  collision;** independent of the schema migration.

## Dependencies / prereqs
Soft: best validated **after SPEC-24** (real storylet content to check) — but the checks can be developed
against a planted fixture independently. Pairs with SPEC-26 (gates pipeline-emitted storylets).

## Test strategy
A unit test for the unsatisfiability heuristic (true positives + no false positives on real packs) + a
planted-bad-storylet run that each check rejects + `pnpm content:verify` green on real content + `pnpm verify`.

## Effort
M.

## Out of scope
A full constraint/SAT solver; any **runtime** storylet check (engine stays as-is); changes to quest
verification; performance tuning beyond linear passes.
