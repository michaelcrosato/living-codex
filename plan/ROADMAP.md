# /plan/ROADMAP.md — The Living Codex Transformation Roadmap

> **Status:** Cycle 1 authored 2026-05-29 (SPEC-01…15 **Done**, SPEC-16 carryover).
> **Cycle 2 (v2026.05) authored AND EXECUTED 2026-05-29** — SPEC-16…26 all **Done** (one local
> commit each, `pnpm verify` green throughout; final: 185 tests / 40 files, audit clean, HEAD 499c77c).
> See [§7 below](#7-cycle-2-v202605--the-next-wave).
> **Cycle 3 (v2026.05-c3) authored AND EXECUTED 2026-05-30** — SPEC-27…33 all **Done** (one local commit
> each, `pnpm verify` green throughout; final: 195 tests / 42 files, audit clean, mutation baseline 73.31%,
> HEAD 0677e38). tsgo accelerator, Stryker mutation testing, model-based PBT, drama-manager salience, new
> Drip Market pack. See [§8 below](#8-cycle-3-v202605-c3--quality-depth--features).
> Source-of-truth for this initiative is the `/plan/` folder. Subordinate to [docs/GOAL.md](../docs/GOAL.md).
> Every item honors the **locked decisions** (GOAL §3) and **engineering invariants** (GOAL §5). If any
> spec conflicts with GOAL.md, GOAL.md wins.

> **Re-baseline (2026-05-29, HEAD `dbb1fd0`):** `pnpm verify` green — **174 tests / 38 files**, 0 dep
> violations, `pnpm audit --prod` clean, content = **4 packs / 14 NPCs / 3 quests / 5 locations**
> (fingerprint `1c8d11480b2aa5`), replay invariant holds. The engine thesis (deterministic, pure,
> vendor-isolated, branching content through one code path) is **proven**. Cycle 2 is **modernization +
> narrative depth**, not rescue. Sections §0–§6 are the Cycle-1 record (kept for rationale); **§7 is the
> active plan.**

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

---

## 7. CYCLE 2 (v2026.05) — the next wave

Authored 2026-05-29 from a fresh deep audit + a 4-search stack pass + a competitive/design research agent.
Cycle 1 left the repo **green and feature-proven**; Cycle 2 has two themes: **(A) dependency modernization**
(the toolchain has moved — Zod 4, TS 6/7, Vitest 4, ESLint 10, fast-check 4, depcruise 17) and **(B)
narrative depth** (make the storylet layer SPEC-11 *earn its keep* through real content, a skill-gated
condition, verifier coverage, and pipeline emission). Everything still honors GOAL §3/§5 — no runtime LLM,
no procedural gen, determinism mandatory, engine-core pure, content is data.

### 7.1 Audit findings that seeded these specs (ground truth)
- **Toolchain drift** (`pnpm outdated`): zod 3.25→4.4, typescript 5.9→6.0 (TS 7 Go-native `tsgo` shipped
  Jan 2026, ~10×), vitest 3.2→4.1, eslint 9.39→10, fast-check 3.23→4, dependency-cruiser 16→17,
  @types/node 22→24+ (runtime is Node 24). `pnpm audit --prod` is **clean** — these are currency/maintenance
  upgrades, not CVE firefighting.
- **`zod-to-json-schema` dead since Nov 2025** → SPEC-16 (carryover) removes it for native `z.toJSONSchema`.
- **Storylet layer is plumbed but unused:** every shipped pack has `storylets: []`, the app never surfaces
  a `TriggerStorylet`, the pipeline synthesizes `storylets: []`, and `content:verify` ignores storylets →
  SPEC-24/25/26.
- **Condition language can't query skills:** `World.player.skills` exists but no `skill_at_least` condition
  → SPEC-23 (the Disco-Elysium passive-check pattern; proven + deterministic).
- **Doc drift:** `SCHEMA.md §3` omits the `Npc.combat`/`homeLocationId` fields that exist in code → SPEC-17.
- **Miniplex (2.0.0) is effectively unmaintained** (last release ~1yr) — but it is already isolated behind
  `engine-core/src/ecs/registry.ts` as a *derived* layer, so the risk is contained (RISK_REGISTER R8; no
  spec — a swap-behind-the-adapter item lives in BACKLOG).

### 7.2 Execution waves (the Cycle-2 DAG)
Cross-wave edges are soft (ordering) unless **HARD**. Within a wave, items are DAG-independent and may run
in parallel worktrees **except** where the collision map says otherwise.

```
WAVE 5  (hygiene + low-risk currency; parallel-safe)
  SPEC-17 doc-sync NPC schema        (docs only)
  SPEC-19 depcruise 17 + @types/node (config/types)
  SPEC-18 eslint 10 + ts-eslint ─────┐  (SPEC-18 & SPEC-20 share the typescript-eslint
                                      │   peer range → serialize them)
WAVE 6  (schema/lang core migration; ISOLATE — broad, golden-master churn)
  SPEC-16 zod 4 + native json-schema  ──HARD──► (all schema-touching specs below)
  SPEC-20 typescript 6 ───────────────┘ (serialize w/ SPEC-18)

WAVE 7  (test-tooling modernization; isolate; baselines shift)
  SPEC-21 vitest 4         (coverage re-baseline; verify.yml)
  SPEC-22 fast-check 4     (keep determinism fuzz green — a new divergence = real bug)

WAVE 8  (narrative depth — the thesis; schema specs require SPEC-16 first)
  SPEC-23 skill_at_least condition  ──HARD──► (needs SPEC-16) ──soft──► SPEC-24
  SPEC-24 storylet content pack + ambient barks  ──soft──► SPEC-25
  SPEC-25 content:verify storylet coverage

WAVE 9  (pipeline intelligence — offline)
  SPEC-26 pipeline emits storylets   (HARD: after SPEC-16; soft: after SPEC-24/25)
```

> **Cycle-2 parallel-worktree collision map** (never edit concurrently):
> the **schema layer** `packages/content-schema/src/*` + `json-schema.ts` + golden-master (SPEC-16,
> SPEC-23, SPEC-26 — all serialize, SPEC-16 first) · `tools/pipeline/src/pipelines/cycle.ts` + the
> golden-master `cycle.test.ts` (SPEC-26) · `.github/workflows/verify.yml` (SPEC-21 coverage step) ·
> the TypeScript/`typescript-eslint` peer pair (SPEC-18, SPEC-20). Parallelize everything else.

### 7.3 Cycle-2 priority matrix
Scores 1–5. **I**=Impact · **F**=Feasibility (5=easy now) · **R**=Risk (lower is better) · **Ft**=Fit to
GOAL · **P = I+F+Ft−R**. Wave reflects the DAG, not just P.

| Spec | Title | Pillar | I | F | R | Ft | P | Wave | Reasoning (1 line) |
|------|-------|--------|---|---|---|----|---|------|--------------------|
| [SPEC-17](specs/SPEC-17-doc-sync-npc-schema.md) | Doc-sync NPC schema | Fixes | 2 | 5 | 1 | 5 | **11** | 5 | Real drift (combat/homeLocationId); docs are the agent's map; zero code risk. |
| [SPEC-23](specs/SPEC-23-skill-at-least-condition.md) | `skill_at_least` condition | Experience | 4 | 4 | 2 | 5 | **11** | 8 | Closes a real gap (skills unqueryable); proven passive-check pattern; additive verb. |
| [SPEC-19](specs/SPEC-19-depcruise17-node-types.md) | depcruise 17 + node types | Future-proof | 2 | 5 | 1 | 4 | **10** | 5 | Keeps the vendor-isolation guard current; re-prove rules fire; cheap. |
| [SPEC-24](specs/SPEC-24-storylet-content-pack.md) | Storylet pack + ambient barks | Experience | 4 | 3 | 2 | 5 | **10** | 8 | Makes SPEC-11 earn its keep end-to-end; same path as SPEC-13 did for quests. |
| [SPEC-25](specs/SPEC-25-content-verify-storylets.md) | content:verify storylets | Quality | 3 | 4 | 2 | 5 | **10** | 8 | Stops silently-dead storylets (unreachable/dangling); offline, deterministic. |
| [SPEC-26](specs/SPEC-26-pipeline-emits-storylets.md) | Pipeline emits storylets | Pipeline | 3 | 3 | 2 | 5 | **9** | 9 | Lets AI-authored packs use the storylet layer; hermetic StubProvider; golden churn. |
| [SPEC-18](specs/SPEC-18-eslint10-tseslint.md) | ESLint 10 + ts-eslint | Future-proof | 2 | 4 | 2 | 4 | **8** | 5 | Keeps the linter in support; flat config already in place; watch new default rules. |
| [SPEC-16](specs/SPEC-16-zod4-native-jsonschema.md) | Zod 4 + native JSON Schema | Future-proof | 3 | 3 | 3 | 4 | **7** | 6 | Drops dead dep + the recursive-ref warning; broad (every schema + golden); isolate. |
| [SPEC-20](specs/SPEC-20-typescript-6.md) | TypeScript 6 | Future-proof | 3 | 3 | 3 | 4 | **7** | 6 | Bridge to TS 7 native; dual-typecheck is verify's long pole; keep purity + tsc gate. |
| [SPEC-21](specs/SPEC-21-vitest-4.md) | Vitest 4 | Future-proof | 3 | 3 | 3 | 4 | **7** | 7 | Currency; coverage remap + `workspace`→`projects` + mock semantics; re-baseline. |
| [SPEC-22](specs/SPEC-22-fastcheck-4.md) | fast-check 4 | Quality | 2 | 3 | 3 | 5 | **7** | 7 | Keeps the determinism fuzz current; port, not redesign; bound runs, pin seeds. |

### 7.4 Sequencing recommendation (autonomous)
1. **Wave 5** first — `SPEC-17` (docs), `SPEC-19` (config), `SPEC-18` (lint). Fast wins; rebuild green-keeping
   muscle; `SPEC-18`→`SPEC-20` are serialized via typescript-eslint.
2. **Wave 6** — `SPEC-16` (Zod 4) then `SPEC-20` (TS 6), each on its **own branch**, full diff before merge.
   **SPEC-16 is HARD-before every schema-touching feature spec (SPEC-23, SPEC-26).**
3. **Wave 7** — `SPEC-21` + `SPEC-22` (test tooling), separate worktrees; re-baseline coverage; keep the
   determinism gate green.
4. **Wave 8** — `SPEC-23` (skill verb) → `SPEC-24` (storylet content) → `SPEC-25` (verifier). The visible
   narrative-depth payoff.
5. **Wave 9** — `SPEC-26` (pipeline emits storylets), reconciling the golden-master last.
- **Re-baseline (`pnpm verify`, `git log`, `pnpm outdated`) at the start of every wave — this plan ages.**
- A spec is done only at full DoD (see [AGENTS.md](AGENTS.md) + [PROGRESS.md](PROGRESS.md)); discoveries →
  [BACKLOG.md](BACKLOG.md), never silently absorbed.

### 7.5 Explicitly deferred (in BACKLOG — do not build without a spec)
TS 7 / `tsgo` as a local typecheck accelerator (keep `tsc` authoritative); Vite 7→8; WebGPU renderer;
a `fc.commands` model-based test suite; persona-diverse critics + multi-hop contradiction detection (real-
model-gated); a Miniplex→bitECS swap behind the existing `ecs/registry.ts` adapter; a drama-manager planner.
**Note:** the old "unified (flat) quality vector" idea is now **contraindicated** by 2026 design practice
(Kennedy's resource-narrative critique) — prefer the *segmented/typed* condition language (SPEC-23 is the
first step). See [BACKLOG.md](BACKLOG.md).

---

## 8. CYCLE 3 (v2026.05-c3) — quality-depth + features

Authored 2026-05-30 from a fresh post-Cycle-2 audit + targeted research. **The dependency-modernization theme
is exhausted** (`pnpm outdated` shows only `@types/node` 24→25 — deliberately pinned to the Node-24 runtime —
and a minor `vite-tsconfig-paths` bump). All files are healthy (largest 348 lines). `pnpm verify` green (185
tests), `pnpm audit --prod` clean. So Cycle 3 pivots from version bumps to **test-quality depth, a faster gate,
and narrative depth** — all honoring GOAL §3/§5 (no runtime LLM, determinism mandatory, engine-core pure,
content is data).

### 8.1 Research that seeded these specs
- **tsgo (TS 7 native)** is production-ready for `--noEmit` type checking (mid-2026; >98% tsc-compatible,
  ~10× faster). This repo's `tsc` is **noEmit-only** (Vite emits) → ideal, low-risk accelerator → **SPEC-29**.
- **Mutation testing (Stryker):** "coverage lies; mutation score tells the truth." GOAL §5.8 makes tests the
  contract → measure whether they actually catch regressions on the determinism-critical core → **SPEC-30**.
- **fast-check `fc.commands`** model-based testing (now that fast-check 4 is in) → richer state-machine
  determinism fuzz → **SPEC-31**.
- Storylets are now real (SPEC-11/24/26) → a deterministic **drama-manager salience policy** is unblocked
  (design-note-gated) → **SPEC-32**; and **more curated content** is the thesis's core lever → **SPEC-33**.

### 8.2 Execution waves
```
PHASE 0  (Quick Wins & Safety; parallel-safe)
  SPEC-27 tsconfig hygiene + erasableSyntaxOnly
  SPEC-28 coverage non-regression floor            (CI; serialize w/ SPEC-30 on verify.yml)

PHASE 1  (Core Upgrades — tooling/quality depth; mostly parallel)
  SPEC-29 tsgo typecheck accelerator               (tsc stays authoritative)
  SPEC-30 Stryker mutation testing (engine-core)   (report-only; CI job → serialize w/ SPEC-28)
  SPEC-31 fc.commands model-based determinism suite

PHASE 2  (Major Features — narrative depth)
  SPEC-33 new hand-authored content pack           (exercises skill_at_least + storylets)
  SPEC-32 drama-manager waypoint  ──needs design note; soft-after──► SPEC-31
```

> **Collision map:** `.github/workflows/verify.yml` (SPEC-28, SPEC-30 — serialize) ·
> `engine-core/src/systems/storylet.ts` (SPEC-32 — solo). Everything else parallelizes.

### 8.3 Cycle-3 priority matrix
**P = I+F+Ft−R** (1–5 each; R lower = better). Wave reflects the DAG.

| Spec | Title | Pillar | I | F | R | Ft | P | Phase |
|------|-------|--------|---|---|---|----|---|-------|
| [SPEC-29](specs/SPEC-29-tsgo-typecheck-accelerator.md) | tsgo typecheck accelerator | Future-proof/DX | 4 | 4 | 2 | 5 | **11** | 1 |
| [SPEC-27](specs/SPEC-27-tsconfig-hygiene.md) | tsconfig hygiene + erasableSyntaxOnly | Future-proof | 2 | 5 | 1 | 4 | **10** | 0 |
| [SPEC-30](specs/SPEC-30-mutation-testing-engine-core.md) | Stryker mutation testing (engine-core) | Quality | 4 | 3 | 2 | 5 | **10** | 1 |
| [SPEC-31](specs/SPEC-31-fastcheck-model-based-suite.md) | fc.commands model-based suite | Quality/Determinism | 4 | 3 | 2 | 5 | **10** | 1 |
| [SPEC-33](specs/SPEC-33-new-content-pack-depth.md) | New content pack (depth) | Experience/Pipeline | 4 | 3 | 2 | 5 | **10** | 2 |
| [SPEC-28](specs/SPEC-28-coverage-floor.md) | Coverage non-regression floor | Quality | 3 | 4 | 2 | 4 | **9** | 0 |
| [SPEC-32](specs/SPEC-32-drama-manager-waypoint.md) | Drama-manager waypoint salience | Experience | 4 | 2 | 3 | 4 | **7** | 2 |

### 8.4 Sequencing recommendation (autonomous)
**Phase 0** (SPEC-27, SPEC-28 — fast safety) → **Phase 1** (SPEC-29 accelerator; SPEC-30 + SPEC-31 quality, the
mutation baseline often *informs* where tests are weak) → **Phase 2** (SPEC-33 content; then SPEC-32 with its
design note first). Re-baseline (`pnpm verify`, `pnpm outdated`, mutation score) at each phase. Discoveries →
[BACKLOG.md](BACKLOG.md). Still **deferred** (not specs): Vite 7→8, WebGPU, Miniplex→bitECS swap (no driver —
contained behind `ecs/registry.ts`), persona critics + multi-hop contradiction detection (real-model-gated),
`@types/node` 25 (ahead of runtime).

## 9. CYCLES 4–6 (v2026.05-afk) — autonomous AFK hardening arc

Unlike Cycles 2–3 (pre-planned waves), Cycles 4–6 ran under the perpetual AFK loop: AUDIT→EXECUTE→REPLENISH
per discovery, no human in the loop. Specs were written just-in-time as the audit surfaced the next
highest-value target. Captured here so the ROADMAP stays the durable record (details in JOURNAL/PROGRESS).

### 9.1 What shipped (SPEC-34 … SPEC-43)
- **Playable content depth.** SPEC-34 (combat overkill/post-mortem HP≥0 invariant), SPEC-36 + SPEC-37 (all
  6 quest objective kinds now tested), SPEC-38 (`met_marrow` → quest-offer trigger). SPEC-35 made the Drip
  Market reachable by resolving the cross-pack-exit trap via **master/plugin geography layering** (the
  exit-target *location* lives in the base pack; content overlays from the dependent pack) — see SPEC-42.
- **The content-safety boundary is now fully test-hardened** (the repo's core thesis — "AI-authored content
  can never silently break the game"). Its three layers each gained tested logic: **referential integrity**
  (SPEC-39, `integrity.ts` mutation 19.70%→45.45%), **semantic canon graph** (SPEC-40, `canon-graph.ts`
  53.42%→58.22%), and the **static playability gate** (SPEC-43 — extracted the inline-and-untested
  solvability/reachability/exit-bounds/offerWhen/dead-storylet rules into the tested
  `staticPlayabilityCheck`, behavior-preserving).
- **Supply-chain.** SPEC-41 pinned transitive `qs` ≥6.15.2 (GHSA-q8mj-m7cp-5q26) via a pnpm-workspace
  override; `pnpm audit` is clean.
- **Contract docs.** SPEC-42 documented the "base pack must load in isolation" layering rule in the durable
  author docs (was only in /plan).

### 9.2 Data-backed state at Cycle-6 close (2026-05-30)
`pnpm verify` green — **213 tests / 43 files**; `pnpm audit` clean; deps current (vite 7.3.3 & @types/node
24.12.4 are the latest *within-major* — only the deferred majors are newer); **zero** TODO/FIXME/HACK/
ts-ignore/eslint-disable in `packages` or `tools`; all three content-safety layers have tested logic.
Engine-core mutation **re-measured this cycle** (SPEC-30 baseline 73.31% → Cycle-5 75.14%): aggregate
**69.83%** — the drop vs. Cycle-5 reflects new code added in Cycles 4–6 generating fresh mutants, not a
regression. The re-measure earned its keep: it surfaced `combat.ts` still at **50%** (SPEC-34 hardened the
damage/HP side, but the *target-selection predicate* was unpinned) — a genuine gameplay gap, **not**
low-risk — now closed by **SPEC-44 (combat.ts 50%→100%)**. `quests.ts` rose to 77.23% (SPEC-36/37). `rng.ts` got the
same scrutiny: its sfc32 *arithmetic* survivors are correctly low-value (determinism is the tested contract;
exact PRNG values would be brittle golden-value chasing), but its `deserializeRng` *validation* — the
corrupt-save boundary (SPEC-10 loads a persisted RNG state) — was a genuine gap, now closed by **SPEC-45
(rng.ts 64%→78%)**. After 44+45 the engine-core residual is **verified low-risk by inspecting the actual
survivors** (not by trusting a label — the lesson combat taught): `snapshot.ts` hashing (43.75% — the hash
still distinguishes states; exact values brittle), the sfc32 arithmetic, and `world.ts`'s `defId` label +
the player's initial `alive` flag (both unobservable). These are genuinely **do-not-chase** per SPEC-30.

### 9.3 The Cycle-7 frontier (honest assessment)
The highest-value remaining leap is **real multi-model generation** end-to-end (Architect/Loremaster/
Dramatist/Critic) and its quality upgrades (**persona-diverse critics**, **multi-hop context-context
contradiction detection**, prompt-caching). All are **BLOCKED on a paid `OPENROUTER_API_KEY`** + explicit
human authorization to spend (see [BLOCKED.md](BLOCKED.md) / [BACKLOG.md](BACKLOG.md)) — the AFK guardrails
forbid unattended spending/secret use, and the StubProvider path is the hermetic substitute already in
place. **Until a human unblocks that, the unblocked queue is diminishing-value hardening only** — and the
repo's own discipline (SPEC-30, GOAL §3) says not to manufacture churn (mutation-number chasing, speculative
verbs/features). Net: Cycle-7's high-value work is human-gated; the loop continues on genuine, non-churn
hardening/hygiene where it exists, and otherwise holds the line (green gates, clean audit, current deps).
