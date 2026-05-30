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

## Gated on a profile or a real demand (don't pre-optimize / don't add speculative verbs — GOAL §3, ARCH §8)
- **Render perf: `GraphicsContext` reuse + app-level culling** in `render-pixi`/`scene`. ARCH §8 requires
  a cited profile before perf-motivated complexity. Add only if a frame is measured heavy (>~500 entities).
- **New engine verbs** (lockpicking, time-of-day/`wait`, trade/economy, status effects, a magic system).
  GOAL §3 + SCHEMA §5: add a verb **only when curated content demands it** (the bribe pattern). Each is a
  clean Recipe-1/Recipe-5 ticket *when the demand is real* — not before.
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
- **Vite 7 → 8** — major; do *after* any 7.x patch line is exhausted. Rolldown not yet 1.0. (Vitest 4 runs
  fine on Vite 7, so no forcing function.) Still deferred.
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
- **~~Wire ashfall_district → drip_market~~ DONE (SPEC-35, 2026-05-30)** via master/plugin layering
  (geography moved into pack.opening). Remaining follow-up: **the `flag.met_marrow` quest-offer trigger** —
  `quest.market_debt`'s `offerWhen` needs `flag.met_marrow`, but nothing sets it yet, so the quest doesn't
  offer in-game even though the district is reachable + NPCs are talkable. Add a `VAR met_marrow` to
  `drip_vendor.ink` (`~ met_marrow = true`) + `declaredVars: ["met_marrow"]` so the dialogue system mirrors
  it to `flag.met_marrow` on talking to Marrow; recompile Ink. Small, clean Recipe-style follow-up.

## Notes
Every item above was considered and *deliberately deferred* during the 2026-05-29 planning pass. The
reasons (paid/blocked, profile-gated, redesign-scale, or convenience-only) are why they are **not** in
[ROADMAP.md](ROADMAP.md). Reassess at each wave gate.
