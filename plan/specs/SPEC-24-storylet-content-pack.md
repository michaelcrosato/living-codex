# SPEC-24 — Author a storylet pack + surface salient ambient barks (prove SPEC-11 end-to-end)

- **Status:** Todo · **Pillar:** Experience · **Wave:** 8 · **Priority:** P=10
- **I**=4 **F**=3 **R**=2 **Ft**=5 · **LOW-MED risk — content + thin app-web view; engine-core untouched.**

## Description
SPEC-11 added the storylet **layer** — `storyletSystem` filters storylets by precondition, ranks by
`salience`, and emits `TriggerStorylet` with the max-salience candidates (tie broken by the seeded RNG
*inside* the fold). But **no shipped pack defines any storylets** (every pack has `storylets: []`) and
the app never surfaces a `TriggerStorylet`, so the feature is unproven end-to-end through real content —
the way SPEC-13 (`pack.kestrel`) proved quests. Author a small hand-curated storylet set and surface the
selected ambient line in the app.

**Design guardrail (research — Emily Short / salience-based narrative):** salience drives **reactive /
ambient** content only (barks, flavor that responds to state). **Main-plot beats stay gated behind
explicit quest flags, never salience**, to avoid the "accidental precondition" failure mode where a
player incidentally satisfies a dramatic beat's preconditions out of order.

## Acceptance Criteria
- A hand-authored pack (extend a core pack or add `content/core/pack.<name>`) defines **≥3 storylets**
  with real `preconditions` (e.g. `reputation_at_least`, `quest_completed`, and — if SPEC-23 landed — a
  `skill_at_least`), distinct `salience`, and ambient text (and/or a `content.dialogueId` override).
  `provenance.authoredBy: "human"`.
- **app-web wiring:** `storyletSystem(storylets)` is in the session's system list (add if absent), and the
  highest-salience `TriggerStorylet` ambient line renders in the HUD/scene. This is a **view concern** —
  `engine-core` and `beats.ts` purity unchanged. Deterministic: same seed + inputs ⇒ same bark.
- **Test (colocated):** storylets load + `content:validate`; the selector picks the max-salience eligible
  storylet; a tie breaks deterministically (seeded); **replay invariant holds** with storylets active
  (`hash(replay)===hash(live)`).
- `pnpm content:validate` + `pnpm content:verify` pass (pack count grows). **Golden-master untouched**
  (hand-authored; no pipeline change).
- Full **`pnpm verify` green** + a real browser check (e2e or documented manual `pnpm dev`) that an
  ambient bark appears when its precondition holds. If you cannot run the UI, **say so explicitly**.

## Implementation approach
`docs/agent-guides/adding-content.md` for the pack; recompile Ink only if a storylet adds dialogue
(`pnpm content:compile-ink`). Wire `storyletSystem` into `session.ts`; render ambient in `hud.ts`/`scene.ts`.
Add the colocated spec. Keep storylets reactive/ambient per the guardrail.

## Files
- `content/core/pack.*/pack.json` (+ `ink/` if a dialogue override), `packages/app-web/src/session.ts`,
  `packages/app-web/src/hud.ts` (or `scene.ts`), a colocated `packages/app-web/test/*.spec.ts`, a short
  doc note. **No schema collision** (content only) — but coordinate with SPEC-23 if storylets use
  `skill_at_least` (then this depends on SPEC-23).

## Dependencies / prereqs
Soft: SPEC-23 (only if a storylet wants a skill gate). Otherwise independent. Pairs naturally with
**SPEC-25** (verifier) — author content, then teach the verifier to check it.

## Test strategy
Storylet selection unit test + replay-invariant assertion with storylets active + `content:validate`/
`content:verify` + browser bark check. Then `pnpm verify`.

## Effort
M.

## Out of scope
The **pipeline** emitting storylets (SPEC-26); a drama-manager / planner that *steers* the player
(BACKLOG); new condition kinds beyond SPEC-23; main-plot content via salience (explicitly disallowed).
