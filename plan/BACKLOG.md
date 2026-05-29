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
- **Unified quality vector** — collapse flags/skills/reputation/progress into one numeric `qualities` map
  that storylet preconditions query (Fallen London QBN model). Powerful but a cross-cutting state redesign;
  only sensible *after* SPEC-11 (storylets) proves the selection model. Touches `World`, conditions,
  migration. (Research: [emshort QBN](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/).)
- **Drama-manager "waypoint" guidance** — soft-steer player input back toward authored beats via salience
  weighting. Long-game coherence feature; depends on a mature storylet layer.
- **Authoring-time branch visualizer** (Twine-style) for the curation review page — a quality-of-life tool
  for human curators, not engine work.

## Toolchain (do when convenient, not urgent)
- **Vitest 3 → 4** — mechanical config breaks (`poolOptions`→top-level, `maxThreads`→`maxWorkers`,
  `coverage.all` removed, `projects` over workspaces). LOW-MED risk; bundle with a quiet maintenance window.
- **Vite 7 → 8** — major; do *after* any 7.x patch line is exhausted. Rolldown not yet 1.0.
- **`tsconfig` `erasableSyntaxOnly`** — bans enums/namespaces (we build with Vite, not tsc). Tiny, additive;
  could fold into SPEC-16 or a standalone hygiene commit.
- **web-vitals reporting sink** — if/when a backend exists; until then SPEC-08 buffers locally only
  (offline-first). Don't add network telemetry that breaks the offline guarantee.
- **Doc-sync SCHEMA §3 (NPC)** — found 2026-05-29 while authoring pack.kestrel: `docs/SCHEMA.md §3`
  documents the `Npc` shape WITHOUT the additive `combat: { hp }` and `homeLocationId` fields that
  exist in `content-schema/src/npc.ts`. Same class of drift SPEC-01 fixed for §5/§7/WORLD_STATE §1;
  a one-paragraph doc edit (no code).
- **e2e port robustness** — `packages/app-web/playwright.config.ts` uses `reuseExistingServer: !CI`,
  which blindly reuses ANY server already on :4173. Found 2026-05-29: a foreign dev server squatting
  that port made the slice walk fail with a misleading "#cold-open not found" (the walk passes against a
  clean server — verified on a temp :4199 config). Options: a dedicated/random port, `reuseExistingServer:
  false` locally, or a health-check asserting the served HTML actually contains `#cold-open` before testing.

## Notes
Every item above was considered and *deliberately deferred* during the 2026-05-29 planning pass. The
reasons (paid/blocked, profile-gated, redesign-scale, or convenience-only) are why they are **not** in
[ROADMAP.md](ROADMAP.md). Reassess at each wave gate.
