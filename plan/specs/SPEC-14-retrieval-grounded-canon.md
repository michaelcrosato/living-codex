# SPEC-14 — Retrieval-grounded canon authoring

- **Status:** Todo · **Pillar:** Pipeline (offline) · **Wave:** 3 · **Priority:** P=9
- **I**=3 **F**=3 **R**=2 **Ft**=5

## Description
Today the cycle grounds models with the whole canon index + checks contradictions *after* generation (Critic +
canon-assertion graph). 2026 best practice is to also ground at **write time**: feed each role only the
**relevant canon-assertion subgraph** for the brief's `ground_in` entities, which cuts hallucinated
cross-references and contradictions before they happen (KG-guided generation: [arXiv 2505.24803](https://arxiv.org/html/2505.24803v2);
SCORE state-tracking: [arXiv 2503.23512](https://arxiv.org/pdf/2503.23512)). Fully offline; reuses the existing
`canon-graph`.

## Acceptance Criteria
- A pure query over the canon graph returns the subgraph relevant to a set of seed IDs (the brief's
  `ground_in` + their 1-hop neighbors: factions, allies/rivals, members, locations, status assertions).
- `runCycle` injects this subgraph as **grounding context** into each role's prompt (system or user), alongside
  the existing canon index, so the Architect/Loremaster/Dramatist author *against* known facts.
- The injected grounding is **deterministic** (stable ordering/serialization) so the cycle stays reproducible
  under StubProvider.
- Hermetic test (StubProvider) asserts the grounding subgraph is correctly assembled for a sample brief and is
  passed to the provider (spy on `complete`'s `system`/`user`). Because StubProvider ignores prompt content, the
  **golden-master pack is unchanged** — confirm via `cycle.test.ts` (if it *does* change, the grounding leaked
  into output shape — investigate).
- `pnpm verify` green; offline-only (no network).

## Implementation approach
Read `packages/content-loader/src/canon-graph.ts` (graph build + existing queries), `tools/pipeline/src/pipelines/cycle.ts`,
`tools/pipeline/src/brief.ts`, and `tools/pipeline/src/prompts/*`. Add a `relevantSubgraph(graph, seedIds)`
query (1-hop neighborhood) — put it next to `buildCanonGraph` if it belongs to the loader, or in the pipeline if
it's pipeline-only orchestration. Serialize it compactly (the same "small enough to fit in context" spirit as
the canon index) and prepend to role prompts in `runCycle`.

## Files
- `packages/content-loader/src/canon-graph.ts` *or* a new `tools/pipeline/src/grounding.ts` (+ test),
  `tools/pipeline/src/pipelines/cycle.ts`. **Collision:** `cycle.ts` shared with SPEC-15 — sequence.

## Dependencies / prereqs
Reuses the S5 canon-assertion graph. Coordinate `cycle.ts` with SPEC-15.

## Test strategy
Unit: `relevantSubgraph` returns expected neighbors for a fixture graph (and excludes unrelated packs).
Integration: StubProvider cycle still produces the golden pack; spy confirms grounding was injected.

## Effort
M (~2.5 hr).

## Out of scope
Embedding/vector retrieval (overkill at our canon size — 1-hop graph neighborhood suffices); real-model quality
claims (needs a key); changing the contradiction *rules* (that's the graph's job, untouched here).
