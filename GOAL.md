# GOAL.md — operational state for autonomous agents

> This is the **operational snapshot** an agent reads to act today. The product
> **north star / invariants** live in [docs/GOAL.md](docs/GOAL.md) — that doc wins all
> conflicts about *what to build*; this doc tells you *where things stand and how to work*.

## Purpose
The Living Codex: a browser top-down 2D RPG with an **AI-coded, pure, deterministic engine**
(Pipeline A) that loads **AI-authored, human-curated, schema-validated static content** (Pipeline B).
The two meet only at the content treaty (`packages/content-schema`). No live LLM calls, no
procedural generation, no in-place `World` mutation, and `hash(replay(log,seed)) === hash(live)`
must always hold.

## Current state (2026-05-29)
- **Build:** complete through the original tickets T-00…T-16 plus the ULTRA hardening pass
  (S1–S5, S3.1–S3.4). The engine is playable in a browser (`pnpm dev`).
- **Gate:** `pnpm verify` is **green** — 143 tests (typecheck, lint, deps:check, test,
  content:validate, content:verify, replay:verify). Browser e2e (`pnpm e2e`) is non-blocking.
- **Content:** 3 packs (`content/core/pack.opening`, `pack.bribe_demo`, `content/generated/pack.the_drip_patrons`).
- **Latest:** S5 canon assertion graph (`packages/content-loader/src/canon-graph.ts`).

## End state
Each new mechanic/content addition lands as a small, in-scope change with colocated tests,
`pnpm verify` stays green, the replay invariant holds, vendor isolation and engine-core purity
are preserved, and docs/tickets stay factual. An agent can pick up the top open ticket and ship
it AFK without breaking gates.

## Non-goals
Multi-agent orchestration, live/runtime LLM calls, procedural generation, networking/multiplayer,
new vendor lock-in, or any change that special-cases content inside the engine.

## Constraints & assumptions
- **pnpm** is the package manager (pinned `packageManager`), **Node ≥ 20** (CI uses 24).
- Vendor isolation is enforced by dependency-cruiser: `pixi.js` only in `render-pixi`, `inkjs`
  only in `narrative-ink`, no `packages/` imports `tools/`.
- `engine-core` is DOM/node/vendor-free; the split typecheck (`tsconfig.json` + `tsconfig.dom.json`) guards this.
- The offline pipeline needs `OPENROUTER_API_KEY` only for *real* generation; without it a
  deterministic demo stub runs, so all gates pass with no secrets. See `.env.example`.
- Full invariant list: [AGENTS.md](AGENTS.md) "Never do these" + [docs/GOAL.md](docs/GOAL.md) §5.

## Read-first order
1. [GOAL.md](GOAL.md) (this) → 2. [AGENTS.md](AGENTS.md) → 3. [ROADMAP.md](ROADMAP.md) →
4. [docs/ai/REPO_MAP.md](docs/ai/REPO_MAP.md) → 5. top open ticket in [tickets/](tickets/).
For deep work, the relevant `docs/*.md` (ARCHITECTURE, WORLD_STATE, SCHEMA) and the package `index.ts`.

## Commands
`pnpm install` · `pnpm dev` · `pnpm verify` (full gate) · `pnpm test` · `pnpm typecheck` ·
`pnpm lint` · `pnpm deps:check` · `pnpm content:validate` · `pnpm content:verify` ·
`pnpm replay:verify` · `pnpm e2e`. Agent wrappers: `scripts/agent/{bootstrap,doctor,check,status,...}.sh`
(or `pnpm agent:bootstrap|agent:doctor|agent:check|agent:status`).

## Patterns
Change `World` only by emitting an `Event` folded through `applyEvent`. Consume RNG only inside
the fold. Reference content by ID, never by hard-coding. Add a verb by extending schema →
event → apply → system → test → a content pack (see `docs/agent-guides/`). Keep files < 600 lines.

## Done
A unit of work is done when: `pnpm verify` is green, new behavior has colocated `*.test.ts`,
the replay invariant holds, public API changes are reflected in the package `index.ts`, the
ticket and any affected docs are updated, and changes are committed locally.
