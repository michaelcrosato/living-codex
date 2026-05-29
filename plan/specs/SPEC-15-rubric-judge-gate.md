# SPEC-15 — Rubric LLM-judge quality gate (advisory)

- **Status:** Todo · **Pillar:** Pipeline (offline) · **Wave:** 3 · **Priority:** P=9
- **I**=3 **F**=3 **R**=2 **Ft**=5

## Description
Schema validation cannot catch *schema-valid-but-wrong* content (LLMStructBench: 97–98% of residual large-model
errors are "wrong-value" — flat dialogue, weak stakes, off-canon tone). The defense is an explicit **rubric-based
judge** with **integer** scales and documented bias mitigation, folded into the curation bundle as **advisory**
(it flags for the human; it does not silently auto-reject). The Critic role already scores proposals — formalize
it into a locked rubric. (Research: [Confident AI LLM-as-judge](https://www.confident-ai.com/blog/why-llm-as-a-judge-is-the-best-llm-evaluation-method),
[RULERS](https://arxiv.org/pdf/2601.08654).)

## Acceptance Criteria
- A `Scorecard`/`Rubric` type with **integer** (e.g. 1–5) scores per locked criterion — canon-consistency,
  choice-density, emotional-stakes, novelty, integration-cost (CONTENT_PIPELINE §3) — plus a short rationale per
  criterion and an aggregate.
- The judge step (an extension of the existing Critic arrow) emits this rubric into the curation **bundle** and
  the static review page (`renderBundleHtml`), HTML-escaped.
- Scores are **advisory**: items below a documented threshold are **flagged "needs attention"** for the human,
  **not auto-dropped** (matches the "human curation is required" principle, CONTENT_PIPELINE §1/§4).
- Bias-mitigation is implemented/noted where applicable: integer (not float) scale, fixed criterion order,
  rationale-before-score (CoT), no self-preference (judge prompt is role-neutral).
- Hermetic StubProvider test produces a **deterministic** rubric and asserts low scores flag for review; the
  review page renders the rubric. If the `Scorecard` shape changes, **update the golden-master deliberately** and
  note it.
- `pnpm verify` green; offline-only.

## Implementation approach
Read `tools/pipeline/src/pipelines/cycle.ts` (the Critic arrow + `Scorecard`), `tools/pipeline/src/schemas/proposals.ts`
(Scorecard schema), `tools/pipeline/src/bundle.ts` + the authoring/`renderBundleHtml` path, and `llm/stub.ts`.
Extend/replace the Scorecard with the integer rubric; have the Critic prompt request rationale-then-integer per
criterion; aggregate; thread into the bundle + HTML. Keep the StubProvider's canned scorecard deterministic.

## Files
- `tools/pipeline/src/schemas/proposals.ts`, `tools/pipeline/src/pipelines/cycle.ts`, `bundle.ts` /
  `authoring`/`renderBundleHtml`, prompts, (+ tests). **Collision:** `cycle.ts` shared with SPEC-14 — sequence.

## Dependencies / prereqs
Builds on the existing Critic/Scorecard + curation bundle (S3.4). Coordinate `cycle.ts` with SPEC-14.

## Test strategy
Unit: rubric aggregation + threshold flagging; HTML escaping of rationale. Integration: StubProvider cycle emits
the rubric deterministically; `renderBundleHtml` includes it. Update golden hash if Scorecard shape changed.

## Effort
M (~2.5 hr).

## Out of scope
Auto-rejecting content (human stays in the loop); real-model judge calibration (needs a key + human-agreement
study — BACKLOG); a CI hard-fail on score (advisory only for now).
