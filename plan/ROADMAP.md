# /plan/ROADMAP.md — The Living Codex Transformation Roadmap

> **Status:** authored 2026-05-29. Source-of-truth for this initiative is the `/plan/` folder.
> Subordinate to [docs/GOAL.md](../docs/GOAL.md). Every item here honors the **locked decisions**
> (GOAL §3) and **engineering invariants** (GOAL §5). If any spec conflicts with GOAL.md, GOAL.md wins.

## 0. How this relates to what already exists

The repo already has an operational [ROADMAP.md](../ROADMAP.md) (AFK agent-workflow phases) and
[tickets/](../tickets/) (TICKET001–005). **This `/plan/` does not replace them** — it is a deeper,
research-informed *transformation* backlog produced by the 2026 baseline + external research pass.
Mapping:

- Root `tickets/TICKET005` (CI coverage + doctor) is **subsumed and superseded** by [SPEC-03](specs/SPEC-03-ci-coverage-doctor.md) (same scope, fuller AC).
- The root AGENTS.md workflow loop **still governs execution**; [plan/AGENTS.md](AGENTS.md) adds the
  loop *specifics for this backlog* (verify commands, isolation, self-review, progress recording).
- Ground-truth verified this session: `pnpm verify` green (143 tests / 33 files, 0 dep violations),
  `pnpm audit` clean (prod+dev), Vite 7.3.3 / esbuild 0.27.7+0.28.0 / TS 5.9.3 / Zod 3.25.76 /
  zod-to-json-schema 3.25.2 / pixi 8.18.1 / inkjs 2.4.0 / vitest 3.2.4.

## 1. Guiding constraints (do not relitigate — GOAL §3/§5)

No procedural generation · **no live/runtime LLM calls** · browser top-down 2D · vector-first
(Pixi behind the `Renderer` port) · Ink behind the `Narrative` port · determinism mandatory
(one seeded RNG, replay invariant `hash(replay(log,seed))===hash(live)`) · engine-core pure ·
content is data, not code · one concept per file · ≤3 files to *understand* any task.

## 2. Pillars

1. **Fixes/Hygiene** — close real drift & stubs found in the baseline.
2. **Quality/Determinism/Observability** — make correctness *enforceable* and the offline-first
   app *operable*, without breaking determinism or adding network coupling.
3. **Player Experience (features)** — accessibility, durable saves, content depth.
4. **Pipeline B (offline content)** — make AI-authoring more robust & coherent; all build-time.
5. **Future-proofing (deps)** — deliberate, risk-rated upgrades; drop unmaintained deps.

## 3. Execution waves (the DAG)

Waves are ordered for momentum & risk. **Within a wave, items are DAG-independent and may run in
parallel worktrees** unless a collision is noted. Cross-wave edges are *soft* (ordering, not hard
blocks) unless marked **HARD**.

```
WAVE 0  (hygiene + infra warm-up; all parallel-safe)
  SPEC-01 doc-sync ──┐
  SPEC-03 ci-coverage-doctor ──┐
  SPEC-06 ci-supply-chain-hardening ──┤  (SPEC-03 & SPEC-06 both edit verify.yml → NOT parallel
  SPEC-07 depcruise-layers ──┘         with each other; serialize these two)

WAVE 1  (determinism + correctness)
  SPEC-04 per-tick-state-hash ──► (soft) SPEC-05 fastcheck-command-fuzz
  SPEC-02 wire-talk_to
  SPEC-12 pipeline-tolerant-preparser

WAVE 2  (experience + durability + ops)
  SPEC-09 accessibility-pass        (edits app-web dialogue UI)
  SPEC-10 durable-saves-migration   (edits persistence + app-web)
  SPEC-08 offline-observability     (edits app-web beats; coordinate w/ SPEC-09 on main.ts)
  SPEC-13 new-curated-pack          (offline StubProvider; content only)

WAVE 3  (depth + pipeline intelligence)
  SPEC-16 zod4-native-jsonschema  ──HARD──► SPEC-11 storylet-layer   (do Zod4 first IF both pursued)
  SPEC-14 retrieval-grounded-canon
  SPEC-15 rubric-judge-gate
```

> **Parallel-worktree collision map** (files that must not be edited by two concurrent agents):
> `.github/workflows/verify.yml` (SPEC-03, SPEC-06) · `packages/app-web/src/main.ts` (SPEC-08, SPEC-09, SPEC-10) ·
> `packages/content-schema/src/*` + `json-schema.ts` + golden-master (SPEC-16, SPEC-11, SPEC-02) ·
> `tools/pipeline/src/pipelines/cycle.ts` (SPEC-14, SPEC-15). Sequence these; parallelize the rest.

## 4. Priority matrix (explicit reasoning per item)

Scores 1–5. **I**=Impact (product/thesis value), **F**=Feasibility (ready *now* with current code; 5=easy),
**R**=Risk (5=most likely to break something / most uncertain — *lower is better*), **Ft**=Fit (alignment
with GOAL locked decisions; 5=perfect). **P = I+F+Ft−R** (higher = do sooner). Wave reflects DAG, not just P.

| Spec | Title | Pillar | I | F | R | Ft | P | Wave | Reasoning (1 line) |
|------|-------|--------|---|---|---|----|---|------|--------------------|
| [SPEC-06](specs/SPEC-06-ci-supply-chain-hardening.md) | CI supply-chain hardening | Quality | 4 | 5 | 1 | 4 | **12** | 0 | SHA-pin + least-priv + ignore-scripts; cheap, real 2026 threat, no code risk. |
| [SPEC-12](specs/SPEC-12-pipeline-tolerant-preparser.md) | Tolerant pre-parser before repair | Pipeline | 3 | 5 | 1 | 5 | **12** | 1 | Fewer expensive repairs; hermetic StubProvider test; pure offline. |
| [SPEC-01](specs/SPEC-01-doc-sync.md) | Doc-sync (SCHEMA/WORLD_STATE↔code) | Fixes | 2 | 5 | 1 | 5 | **11** | 0 | Real drift (bribe_faction, credits_at_least, v2 World); docs are the agent's map. |
| [SPEC-04](specs/SPEC-04-per-tick-state-hash.md) | Per-tick state-hash divergence | Quality | 4 | 4 | 2 | 5 | **11** | 1 | Turns determinism into a *bisectable* gate; reuses existing hash(); 2 sources. |
| [SPEC-07](specs/SPEC-07-depcruise-layers.md) | depcruise no-orphans + layer rules | Quality | 3 | 5 | 2 | 5 | **11** | 0 | Hardens the boundary the whole thesis rests on; additive config. |
| [SPEC-09](specs/SPEC-09-accessibility-pass.md) | Accessibility pass | Experience | 5 | 3 | 2 | 5 | **11** | 2 | Highest player-value: our product *is* text; DOM-mirror + aria-live + keyboard. |
| [SPEC-10](specs/SPEC-10-durable-saves-migration.md) | Durable saves + schemaVersion migration | Experience | 4 | 4 | 2 | 5 | **11** | 2 | Stops silent save loss (Safari 7-day evict); versioned migration already a doc rule. |
| [SPEC-13](specs/SPEC-13-new-curated-pack.md) | New curated pack via offline cycle | Pipeline | 4 | 4 | 2 | 5 | **11** | 2 | Adds depth + re-proves Pipeline B same-path; StubProvider → unblocked offline. |
| [SPEC-02](specs/SPEC-02-wire-talk_to.md) | Wire `talk_to` objective | Fixes | 3 | 4 | 2 | 5 | **10** | 1 | Schema verb exists but runtime is a stub (quests.ts:146); closes a real gap. |
| [SPEC-03](specs/SPEC-03-ci-coverage-doctor.md) | CI coverage + doctor step | Quality | 3 | 5 | 2 | 4 | **10** | 0 | Visibility into test regressions; supersedes TICKET005; report-only first. |
| [SPEC-05](specs/SPEC-05-fastcheck-command-fuzz.md) | fast-check command-sequence fuzz | Quality | 4 | 3 | 2 | 5 | **10** | 1 | Model-based PBT finds replay/determinism edge cases examples miss. |
| [SPEC-08](specs/SPEC-08-offline-observability.md) | Offline observability (User Timing + error boundary) | Quality | 3 | 4 | 2 | 4 | **9** | 2 | Operability without SaaS/network — stays offline-first & deterministic. |
| [SPEC-14](specs/SPEC-14-retrieval-grounded-canon.md) | Retrieval-grounded canon authoring | Pipeline | 3 | 3 | 2 | 5 | **9** | 3 | Prevent contradictions at *write* time, not just detect; reuses canon-graph. |
| [SPEC-15](specs/SPEC-15-rubric-judge-gate.md) | Rubric LLM-judge quality gate | Pipeline | 3 | 3 | 2 | 5 | **9** | 3 | Catches schema-valid-but-wrong content; hermetic StubProvider; integer rubric. |
| [SPEC-11](specs/SPEC-11-storylet-layer.md) | Storylet / salience selection layer | Experience | 5 | 2 | 3 | 4 | **8** | 3 | The headline content-model upgrade; bigger surface → needs design note first. |
| [SPEC-16](specs/SPEC-16-zod4-native-jsonschema.md) | Zod 4 + native `z.toJSONSchema` | Future-proof | 3 | 3 | 3 | 4 | **7** | 4 | Drops unmaintained dep; MED risk (every schema + golden-master); do in isolation. |

## 5. Definition of done (initiative-level)

The initiative is "done" when the operator chooses to stop, OR all committed specs reach DoD. There is
no requirement to do all 16 — they are independently shippable. A spec is done when **every** holds
(see [plan/AGENTS.md](AGENTS.md)): its own ACs met · `pnpm verify` green · replay invariant holds ·
colocated tests added · public API reflected in `index.ts`/README · docs+ticket+[PROGRESS.md](PROGRESS.md)
updated · committed locally · no unexplained gate failures. Anything discovered & out-of-scope →
[BACKLOG.md](BACKLOG.md), never silently absorbed.

## 6. Sequencing recommendation (if executing autonomously)

Do **Wave 0** first (fast wins, green-keeping muscle), then **Wave 1** (locks determinism harder before
features churn state), then **Wave 2** (the visible player+ops upgrades), then **Wave 3** (depth), and
treat **Wave 4 / SPEC-16** as a deliberate, isolated migration with its own commit and the codemod.
Re-baseline (`pnpm verify`, `git log`) at the start of every wave — this plan ages.
