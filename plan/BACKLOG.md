# /plan/BACKLOG.md — Future / deferred / blocked (NOT committed work)

Ideas that are real but **not** in the committed spec set — because they're speculative, blocked on a
paid service, gated on a profile/demand, or a larger redesign. Promote an item to a `specs/SPEC-NN`
only when it becomes unblocked and clearly scoped. **Nothing here should be built without first being
turned into a spec.** This protects against scope creep (RISK_REGISTER R3).

## Blocked on a paid service / real model (offline-only principle holds)
- **Real multi-model generation cycle** end-to-end (Architect/Loremaster/Dramatist/Critic via
  OpenRouter). Needs `OPENROUTER_API_KEY`. The StubProvider path is the unattended substitute.
- **Prompt-caching for batch builds** (OpenRouter `session_id` sticky routing, Anthropic `cache_control`
  breakpoints, implicit caching). Only meaningful once real generation runs; cost optimization, not
  correctness. (Research: [OpenRouter caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching).)
- **Persona-diverse critics (Multi-Agent Reflexion)** — swap the single Critic for 2–3 persona critics.
  Quality upgrade that only pays off with real models; until then it's plumbing on top of StubProvider.
- **Multi-hop context-context contradiction detection** — 2026 research (MAGIC) shows LLMs miss conflicts
  where one *source* contradicts another across hops; a dedicated validator pass over the canon graph
  would catch what the current single-pass `auditCanon` misses. Pays off mainly with real generation;
  until then the deterministic `auditCanon` + SPEC-25 reference checks are the offline substitute.
  (Research: [MAGIC arxiv 2507.21544](https://arxiv.org/pdf/2507.21544).)
  - _2026 best-practice scan (validation):_ the field's recommended stack is **knowledge-graph grounding +
    contradiction/consistency detection + a faithfulness judge attached to every generate span** — which
    this repo **already implements** for the deterministic-feasible parts (the canon-graph IS the KG;
    `relevantSubgraph` grounding = SPEC-14; the rubric judge = SPEC-15; `auditCanon` = contradiction pass).
    Concrete technique anchors for the real-model enhancement when unblocked: **entailment-style grounding
    checks** (verify the output is entailed by its grounding facts — TruLens/Ragas-style), and **MetaQA
    metamorphic prompt mutations** (detect inconsistency in *closed-source* models via prompt variants, no
    token-probs/activations needed — fits the OpenRouter closed-API constraint). All real-model-gated.
    (Research: [LLM hallucination best-practices 2026 (Lakera)](https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models),
    [Microsoft: mitigating LLM hallucinations](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/best-practices-for-mitigating-hallucinations-in-large-language-models-llms/4403129).)

## Gated on a profile or a real demand (don't pre-optimize / don't add speculative verbs — GOAL §3, ARCH §8)
- **Render perf: `GraphicsContext` reuse + app-level culling** in `render-pixi`/`scene`. ARCH §8 requires
  a cited profile before perf-motivated complexity. Add only if a frame is measured heavy (>~500 entities).
  _Perf-audit resolution (2026-05-30): NOT warranted + no runtime profile needed — the entire content set is
  ~17 NPCs / 7 locations (and entities render per-location, so a handful per frame), an order of magnitude
  below the item's own >500-entity trigger. Sim throughput is fine too: replay-fuzz runs 200×≤80-event
  sequences fast, and saves replay only a snapshot+tail (not from dawn). Revisit only if a future content
  batch pushes a location toward ~500 concurrent entities._
- **Bundle-size baseline + Rolldown chunking (re-measured 2026-05-30, post-SPEC-61 Vite 8):** under Vite 7
  the build split the Pixi renderer backends (WebGL/WebGPU/Canvas) into separate chunks (main 190 kB gzip +
  per-backend chunks loaded on demand). **Vite 8 / Rolldown changed the default**: it emits one ~280 kB-gzip
  `index` chunk (the renderer backends are no longer split out), and builds ~10× faster (230ms vs 2.5s). The
  app is correct + e2e-green either way. The size shift is a **perf/size consideration, not a defect**:
  ~280 kB gzip for a cache-once offline-first Pixi game is still reasonable, and restoring the split now
  requires explicit `build.rolldownOptions.output` chunking config — **perf-motivated complexity gated by
  ARCH §8** (needs a cited cold-load profile). **Do not chase** absent a measured cold-load problem; revisit
  with `rolldownOptions.output.advancedChunks`/`codeSplitting` only if a profile shows the larger initial
  chunk (or shipping all 3 renderer backends) actually hurts load time.
- **New engine verbs** (lockpicking, time-of-day/`wait`, trade/economy, status effects, a magic system).
  GOAL §3 + SCHEMA §5: add a verb **only when curated content demands it** (the bribe pattern). Each is a
  clean Recipe-1/Recipe-5 ticket *when the demand is real* — not before.
- **NPC `silhouette` shape variation (SPEC-74 follow-up).** `appearance.silhouette` (tall/stocky/cloaked/
  mech/beast) is authored but the scene draws all NPCs as circles (colors now honored — SPEC-74). Varying the
  drawn SHAPE by silhouette needs new `Renderer` primitives / per-silhouette vector shapes. Defer until it's
  worth the renderer work — cosmetic; bodyColor/accentColor already differentiate NPCs visually.
- **WebGPU renderer** behind the existing `Renderer` port. Pixi recommends WebGL2 for production in 2026;
  revisit only if a batch-break-heavy scene profiles badly. The port already makes this a swap, not a rewrite.
- **OPFS / Storage Buckets persistence.** Beats IndexedDB only for *large blobs*; relevant when AI-generated
  sprite/audio assets land, not for small JSON saves. Storage Buckets is still experimental (WICG).

## Larger redesigns (need a design doc before a spec)
- **~~Unified (flat) quality vector~~ — NOW CONTRAINDICATED (2026 research).** The original idea was to
  collapse flags/skills/reputation/progress into one numeric `qualities` map (Fallen London QBN model).
  Alexis Kennedy's 2026 "resource narrative" critique argues a *flat* vector **erases meaningful
  distinctions** (PC stats == currency == story flags) and recommends **typed/segmented** qualities with
  kind-appropriate operations. The Living Codex already segments naturally (`skills`/`inventory`/
  `reputation`/`flags`/`quests`). **Preferred direction instead:** extend the *typed* condition language
  one verb at a time — **SPEC-23 (`skill_at_least`) is the first step**; add `resource_at_least` /
  `progress_is` etc. only when content demands (the bribe pattern). Do **not** collapse into one map.
  (Research: [Kennedy: QBN→resource narratives](https://weatherfactory.biz/qbn-to-resource-narratives/),
  [emshort QBN](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/).)
- **~~Drama-manager "waypoint" guidance~~ → PROMOTED to [SPEC-32] (Cycle 3 Phase 2).** SPEC-24 landed
  (storylet content proven), so it's unblocked — but kept design-note-gated and MED-HIGH risk (touches the
  storylet selector + replay). Must stay a deterministic, offline, static ranking policy (no runtime planner).
  (Research: [Ware 2022 salience planning](https://cs.uky.edu/~sgware/reading/papers/ware2022salience.pdf).)
- **Authoring-time branch visualizer** (Twine-style) for the curation review page — a quality-of-life tool
  for human curators, not engine work.

## Toolchain (do when convenient, not urgent)
- **~~TS 7 / `tsgo` accelerator~~ → PROMOTED to [SPEC-29] (Cycle 3).** Mid-2026 research confirms tsgo is
  production-ready for `--noEmit` (this repo's only tsc use) — de-risked from MED-HIGH to LOW-MED; tsc stays
  authoritative.
- **~~Vite 7 → 8~~ → DONE (SPEC-61, 2026-05-30).** Vite 8.0 stable + Vitest 4.1.7 support = the forcing function; upgraded (Rolldown, ~10× faster builds), no breaking-config surfaces used. Bundle-chunking shift noted above.
- **`@types/node` 24 → 25** — major; types-only, no forcing function (no API we use changed; runtime is
  Node ≥20, and installed 24.12.4 is the latest 24.x). Defer until the runtime Node major actually moves —
  bumping ahead of the runtime risks typing APIs that don't exist at run time. (Considered 2026-05-30 Cycle-6.)
- **~~`fc.commands` model-based test suite~~ → PROMOTED to [SPEC-31] (Cycle 3)** now fast-check 4 (SPEC-22) landed.
- **`tsconfig` `erasableSyntaxOnly` — DEFERRED (evaluated in SPEC-27, 2026-05-30).** It bans not just
  enums/namespaces (none exist) but **parameter properties**, used idiomatically in 6 DI constructors
  (`session.ts`, `render-pixi/renderer.ts`, `dialogue-controller.ts`, `dialogue-view.ts`, `llm/{stub,openrouter,adapter}.ts`).
  The project emits via **Vite/esbuild (not type-stripping)**, so the flag's benefit is moot while its cost is
  a 6-file refactor — net-negative. Revisit ONLY if a `node --strip-types`-style runtime is adopted.
- **web-vitals reporting sink** — if/when a backend exists; until then SPEC-08 buffers locally only
  (offline-first). Don't add network telemetry that breaks the offline guarantee.
- **Miniplex → maintained ECS (bitECS / Koota) behind `ecs/registry.ts`** — Miniplex (2.0.0) is unmaintained
  (RISK_REGISTER R8). Only act if it actually breaks under a TS/Node bump; the existing adapter makes the
  swap local (no engine-logic change). Not urgent (audit clean, derived layer).
_(Promoted to specs 2026-05-29: **Vitest 3→4 → [SPEC-21]**. **Resolved 2026-05-29 (SPEC-17 shipped):**
Doc-sync SCHEMA §3 (NPC) — added `combat`/`homeLocationId` to §3, the missing `storylets` field to the §8
`ContentPack`, and a `Storylet` shape subsection. Drift sweep also confirmed `assertions` was documented.)_
_(Resolved 2026-05-29: e2e port robustness — Playwright preview moved to a dedicated port 4319 so a
foreign server on Vite's default 4173/5173 can't be silently reused. See `playwright.config.ts`.)_

## Test gaps — SPEC-30 mutation survivors (triage; do NOT bulk-fix)
Baseline mutation score **73.31%** (2026-05-30, engine-core, 108 survivors). Surviving mutants = behavior a
test didn't catch. Address opportunistically with **targeted** tests where correctness matters; never write
tests just to chase the number. Hotspots (lowest score first):
- **`events/effects.ts` (0%)** — likely all mutants type-error or are exercised only indirectly; verify
  effects.test.ts asserts each effect→event mapping's *values*, not just shape.
- **`state/snapshot.ts` (43.75%)** — hashing/serialization; survivors here are low-risk (hash collisions
  improbable) but a few targeted assertions on snapshot determinism would help.
- **`systems/combat.ts` (50%)** — damage/HP-clamp edges; add cases for 0/over-kill and the alive flag.
- **`state/world.ts` (60%)**, **`time/rng.ts` (64%)**, **`systems/quests.ts` (65%)** — branch/objective
  transitions and RNG bounds; the highest-value targeted tests live here (quests is the biggest surface).
Re-run `pnpm mutation` after adding tests; consider a score *ratchet* spec once the baseline stabilizes.

## Content follow-ups
- **~~Wire ashfall_district → drip_market~~ DONE (SPEC-35)** + **~~met_marrow quest trigger~~ DONE (SPEC-38)**,
  both 2026-05-30. The Drip Market is now fully playable: reachable from the opening district (geography
  layered into pack.opening) and `quest.market_debt` offers once the player talks to Marrow (her Ink sets
  `met_marrow` → `flag.met_marrow`). No open content follow-ups for this district.

## UX (deferred — not over-engineering, GOAL §3)
- **Data-driven HUD consequence journal.** `hud.ts` renders consequence lines from a hardcoded flag→line list (extended for the arc in SPEC-56). If the list keeps growing, promote it to content metadata (a flag→journal-line map authored in packs) so new content surfaces in the HUD without an app edit. Only worth it once the list is long enough to be a maintenance burden; today the curated list is fine.

## Playability-gate guards (extend staticPlayabilityCheck when a real case warrants)
- **~~Auto-completing branch shadows siblings~~ → PROMOTED to SPEC-68 (built the guard).** `questSystem` completes any active branch
  whose objectives are ALL done; a branch whose objectives are all trivially/immediately satisfiable (e.g.
  only a `talk_to` on the giver, which the offer interaction already satisfies) will auto-complete and make
  its sibling branches unselectable. A static check could flag a multi-branch quest where some branch's
  objectives are a strict subset of (or weaker than) another's, or contains no player-gated objective
  (skill_check/reach/defeat/retrieve). Deferred until a 2nd real case appears (one occurrence fixed in-content
  by removing the branch) — promote to a spec then. Parallels the orphan-dialogue (SPEC-53) / unspawnable-NPC
  (SPEC-60) guards.

## UX finding (2026-05-30, SPEC-70 audit) — surface authored ambientText
- **~~Location `ambientText` is authored but unsurfaced~~ → DONE (SPEC-71).** Surfaced in renderHud (slow deterministic rotation by tick). 6 of 8 locations carry atmospheric lines (e.g.
  ashfall_district "A drone coughs past overhead."), but `ambientText` is referenced ONLY in content-schema —
  nothing in app-web/render/scene displays it. Authored atmosphere players never see (parallel to the
  patrons-unspawned / consequence-HUD gaps). **Next-cycle spec:** surface it in the HUD on location entry
  (extend `renderHud` like SPEC-56/24 — show the current location's ambientText deterministically; add a
  hud.spec case; e2e-safe since the cold-open assertions are substring-based). Low-risk, genuine UX. The new
  clinic's ambientText was added for consistency in the meantime (commit 8f44626).

## Notes
Every item above was considered and *deliberately deferred* during the 2026-05-29 planning pass. The
reasons (paid/blocked, profile-gated, redesign-scale, or convenience-only) are why they are **not** in
[ROADMAP.md](ROADMAP.md). Reassess at each wave gate.
