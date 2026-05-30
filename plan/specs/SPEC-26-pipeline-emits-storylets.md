# SPEC-26 — Pipeline emits storylets (offline authoring)

- **Status:** Todo · **Pillar:** Pipeline B (offline content) · **Wave:** 9 · **Priority:** P=9
- **I**=3 **F**=3 **R**=2 **Ft**=5 · **MED risk — golden-master churn; cycle.ts collision. After SPEC-16.**

## Description
The offline cycle (`tools/pipeline/src/pipelines/cycle.ts` → `synthesis.ts`) currently synthesizes every
candidate pack with `storylets: []`. So **AI-authored packs cannot use the storylet layer** the engine
gained in SPEC-11 / the content gained in SPEC-24. Add a schema-constrained "storylet proposal" arrow so
the cycle proposes **ambient/reactive** storylets grounded in the brief + canon, validates them against
the `Storylet` schema, includes them in synthesis, and exposes them to the Critic/rubric. Entirely
build-time; **no runtime LLM**; hermetic via `StubProvider` (no `OPENROUTER_API_KEY` needed).

This mirrors 2026 best practice for offline AI authoring (research): schema-governed generation →
structured-validate → admit, with the new units flowing through the existing canon-audit + rubric gate.

## Acceptance Criteria
- `tools/pipeline/src/schemas/proposals.ts`: a `StoryletProposals` schema — an array of `Storylet`-shaped
  units, **capped by `brief.budget`** (add a `budget.storylets` field, default 0, so existing briefs are
  unaffected).
- `pipelines/cycle.ts`: a new `[TASK:STORYLETS]` arrow (a `StubProvider` routes it deterministically),
  fired only when `brief.budget.storylets > 0`, grounded in the same canon subgraph + arc context as the
  other arrows. `synthesis.ts` includes the validated storylets in the candidate `ContentPack.storylets`;
  the Critic prompt sees them.
- **Prompt guardrail:** the storylet role/task prompt instructs **reactive/ambient** content only (barks,
  flavor) — never main-plot beats (consistent with SPEC-24's design guardrail).
- The **StubProvider demo fixture** (`demo-fixture.ts` / `drip-patrons-fixture.ts`) emits **≥1 deterministic
  storylet** so `cycle.test.ts` exercises the path.
- **Golden-master updated deliberately:** storylets change the candidate-pack bytes → re-derive the hash
  in `cycle.test.ts`, and **record the new hash + reason** in the commit message and PROGRESS (R2). Never
  weaken the assertion to pass.
- Emitted storylets pass `content:validate` + the **SPEC-25 storylet checks**; offline; `pnpm verify` green.

## Implementation approach
Add `budget.storylets` to `brief.ts`; add the proposal schema; add the cycle arrow + synthesis include;
extend the stub fixture with a deterministic storylet; instruct the prompt (reactive/ambient). Reconcile
the golden hash **last**, after the candidate is final. Keep the StubProvider path byte-stable & hermetic.

## Files
- `tools/pipeline/src/schemas/proposals.ts`, `tools/pipeline/src/pipelines/cycle.ts`,
  `tools/pipeline/src/synthesis.ts`, `tools/pipeline/src/prompts.ts`, `tools/pipeline/src/brief.ts`,
  `tools/pipeline/src/demo-fixture.ts` / `drip-patrons-fixture.ts`, `tools/pipeline/src/cycle.test.ts`
  (golden). **Collision:** `cycle.ts` + schema + golden-master — **do NOT run concurrently with SPEC-16 or
  SPEC-23.**

## Dependencies / prereqs
**HARD: after SPEC-16** (schema migration touches `Storylet` + the JSON-Schema call the pipeline uses).
**Soft: after SPEC-25** (so emitted storylets are gated by the verifier) and SPEC-24 (the hand-authored
exemplar informs the prompt). No paid API — `StubProvider` only.

## Test strategy
`adapter.test.ts` + `cycle.test.ts` (golden reconciled) + `content:validate`/`content:verify` (incl.
SPEC-25 checks) on the generated demo pack + full `pnpm verify`. Confirm the path is hermetic (no network).

## Effort
M-L (the golden-master + budget plumbing are the fiddly parts).

## Out of scope
Real multi-model generation (paid, BACKLOG); persona-diverse critics (BACKLOG); multi-hop context-context
contradiction detection (BACKLOG); any runtime/engine behavior change.
