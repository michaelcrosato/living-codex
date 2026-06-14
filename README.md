# The Living Codex

**A browser-based, top-down 2D RPG whose engine is meant to be AI-coded and whose world is
meant to be AI-authored, human-curated, and baked in as static content.**

> ⚠️ **Honest status (2026-06-14): this is a spec-only repo. The implementation does not exist
> on any current branch.** The vision below is real and worth building, but there is no game
> code, no tests, no Vite/Vitest/Playwright, and no content packs checked out here. A prior
> implementation (engine + packs + tests) was deliberately purged on 2026-06-09 and survives in
> git at tag `pre-purge-20260609`. See [`docs/ENGINEERING_REVIEW.md`](docs/ENGINEERING_REVIEW.md)
> for the full audit and [`roadmap/ROADMAP.md`](roadmap/ROADMAP.md) for the path back to a
> buildable slice.

---

## One-liner

A story-first RPG where a small, deterministic engine plays curated, AI-authored content packs —
no live LLM calls, no procedural filler, no backend. Depth and choice over graphics.

## What Living Codex is meant to be

Players come to RPGs for depth and choice, which is exactly where AI is strongest and graphics
are not the point. So the design is two clean halves that meet only at a schema:

- **Pipeline A — the Engine.** A tiny, pure, deterministic TypeScript core that one AI agent can
  own indefinitely. State changes only by folding events; the same seed + event log + content
  fingerprint always reproduces the same world. Renderer and audio sit behind stable ports
  (vector-first; sprites/voice later).
- **Pipeline B — the World.** An offline, human-guided workflow: an ensemble of frontier models
  *propose* content, a human *curates* it, a strict schema *validates* it, and the accepted pack
  ships as **static data**. No generation happens during play.

They meet only at the content schema. As long as a pack validates, the engine runs it — regardless
of who or what authored it. The engine never special-cases a specific quest, NPC, or line of text.

The first milestone is a **10-minute "First Light" slice** in the Ashfall setting: open a URL with
no install or login, meet a stranger, reach a market, take a quest, complete it by talk/sneak/force,
and see a persistent consequence — proven by playtest evidence and deterministic replay.

## Architecture (static by design)

- **Browser-only, no backend, no database, no runtime LLM calls.** Trivially hostable on any
  static CDN; offline-capable; nothing to secure at play time.
- **Content is data, not code** — quests/NPCs/storylets/effects live in schema-validated packs.
- **`World` is flat JSON** (no classes/Map/Set/closures) so it serializes, saves, and replays
  cleanly. State changes only via `GameEvent`s folded through `applyEvent`.
- **Determinism is a hard invariant** — replayed state must hash identical to live state.
- Note: "static" describes *deployment*, not simplicity. This is a real deterministic simulation
  engine plus a content treaty, not a flat-JSON viewer.

## Stack (intended)

- **Language:** TypeScript (strict).
- **Package manager:** pnpm.
- **Build/dev:** Vite (browser app).
- **Unit tests:** Vitest, colocated.
- **Browser smoke / E2E:** Playwright.
- **Content validation:** Zod schema at the engine/world seam.

> The current `package.json` does **not** yet reflect this stack — it carries only the
> AI-operations engine tooling (biome/ts-node/typescript). Reconciling the two is an early task
> (see the review's "Top 5").

## Status, in plain terms

| Thing | State |
|---|---|
| Product vision / spec | Exists (this file + [`GOAL.md`](GOAL.md)). Sound and buildable. |
| Game engine code | **Does not exist** on any current branch. |
| Content packs | **Do not exist** (purged; recoverable at `pre-purge-20260609`). |
| Tests / CI for the game | **None.** |
| Spec docs referenced below (`docs/ARCHITECTURE.md`, `docs/SCHEMA.md`, `content/PACKS.md`, `tickets/`, …) | **Missing** — links are aspirational until restored or rewritten. |

There is no working `pnpm dev`, `pnpm test`, or `pnpm e2e` today. Do not trust any "green" or
"playable" claim in `GOAL.md` — those describe the purged snapshot, not this tree.

## Where to go next

- **[`docs/ENGINEERING_REVIEW.md`](docs/ENGINEERING_REVIEW.md)** — the honest top-to-bottom audit:
  spec-vs-code gap, architecture assessment, risks, and the Top 5 to do first.
- **[`roadmap/ROADMAP.md`](roadmap/ROADMAP.md)** — the prioritized path from spec to a first
  buildable vertical slice.
- **[`GOAL.md`](GOAL.md)** — the product north star (scope, invariants, milestone). Accurate on
  *intent*; stale on *current state* (treat its "current state" section as historical).

## Building on this repo

This repository is also wired to run as a 100% AI-coded project via the AI operations engine
(`CLAUDE.md` is the agent constitution; `roadmap/` holds durable state). That machinery is the
*factory*, not the *product*. If you are here to work on the game, start with the engineering
review and the roadmap above — not with `pnpm install`, which will not build a game today.
