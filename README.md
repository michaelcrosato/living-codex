# The Living Codex

A browser-based, top-down 2D RPG whose **engine is AI-coded** (a pure, deterministic TypeScript
core) and whose **world is AI-authored, human-curated, and baked in as static content.** The engine
is built and browser-playable; `pnpm verify` is green.

> **Coding agents:** start with [AGENTS.md](AGENTS.md) and [GOAL.md](GOAL.md), not this file.
> This README is the human quick start.

## Quick start

Requirements: **Node ≥ 20** and **pnpm** (this repo pins `pnpm@11.1.2`; CI uses Node 24).

```bash
pnpm install            # install dependencies
pnpm dev                # run the app-web dev server (Vite)
pnpm test               # run the test suite (Vitest)
pnpm verify             # full gate: typecheck + lint + deps + tests + content + replay
pnpm e2e                # browser smoke test (needs: pnpm exec playwright install chromium)
```

**Environment:** nothing is required to build, test, or play. The offline content pipeline
(`pnpm pipeline:cycle` / `pnpm pipeline:bake`) uses `OPENROUTER_API_KEY` for *real* generation;
without it a deterministic demo stub runs. See [.env.example](.env.example).

## Controls (in `pnpm dev`)
- **Move:** WASD or arrow keys · **Talk / interact:** E · **Fight:** F
- **Number keys:** pick a dialogue choice when a dialogue is open, otherwise take a numbered exit
- **Esc:** close the dialogue
- **K** save · **O** load · **L** export a save file · **I** import a save file
- A **dyslexia-friendly font** toggle is in the on-screen controls; location changes and quest/consequence
  updates are announced to screen readers (the UI is keyboard-navigable and meets WCAG 2.2 AA contrast).

## Project docs
- [GOAL.md](GOAL.md) — operational state for working on the repo · [ROADMAP.md](ROADMAP.md) — phases + tickets
- [AGENTS.md](AGENTS.md) — agent operating manual · [tickets/](tickets/) — atomic work items
- [docs/ai/REPO_MAP.md](docs/ai/REPO_MAP.md) — where code/tests/config live · [STRUCTURE.md](STRUCTURE.md) — repo tree
- [content/PACKS.md](content/PACKS.md) — default browser content pack catalog

---

## Read order

| # | File | What it is | Audience |
|---|------|------------|----------|
| 1 | [docs/GOAL.md](docs/GOAL.md) | North star: vision, hard scope, invariants. Wins all conflicts. | Everyone |
| 2 | [AGENTS.md](AGENTS.md) | Terse operating manual: commands, never-do list, definition of done. | The agent (keep open) |
| 3 | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, package graph, the pure core, determinism, enforcement. | The agent |
| 4 | [docs/WORLD_STATE.md](docs/WORLD_STATE.md) | The runtime state contract: `World` shape, replay envelope, quest semantics, player model. | The agent |
| 5 | [docs/SCHEMA.md](docs/SCHEMA.md) | The content treaty (Zod/TS) — the seam between engine and world. | Agent + pipeline |
| 6 | [docs/TICKETS.md](docs/TICKETS.md) | The sequenced, acceptance-tested build plan (T-00 … T-16). | The agent |
| 7 | [docs/AGENT_GUIDES.md](docs/AGENT_GUIDES.md) | Recipes for common tasks (add a system, add content, evolve schema, debug). | The agent |
| 8 | [docs/CONTENT_PIPELINE.md](docs/CONTENT_PIPELINE.md) | The offline, human-guided, multi-model content workflow (Pipeline B). | Human operator |
| 9 | [docs/WORLD_BIBLE.md](docs/WORLD_BIBLE.md) | Canon format (incl. the canon layers) + the "Ashfall" starter setting. | Operator + pipeline |
| 10 | [docs/VERTICAL_SLICE.md](docs/VERTICAL_SLICE.md) | The 10-minute "wow" demo, beat by beat. The first milestone's target. | Everyone |

---

## The idea in five sentences

1. A great RPG is a story wrapped in an engine; players come for depth and choice, not graphics — which is exactly where AI is strongest.
2. So we build a tiny, clean, deterministic engine that **one AI agent can own indefinitely**, and we pour **curated AI-authored text content** into it.
3. **No procedural generation, no live LLM calls** — content is proposed by an ensemble of frontier models, chosen by a human, validated against a strict schema, and shipped as static data.
4. Start with **vector graphics and text**; the render and audio layers are behind stable interfaces so AI-generated art and voice can be swapped in later without touching game logic.
5. The showcase is a **10-minute slice** that makes players say "I want more" — and a repo that proves the agent built the engine and the pipeline grew the world.

---

## The two pipelines (never confuse them)

- **Pipeline A — the Engine.** Pure, modular, deterministic TypeScript, built per [docs/TICKETS.md](docs/TICKETS.md). Grows new mechanics as content demands them.
- **Pipeline B — the World.** Run by a human operator per [docs/CONTENT_PIPELINE.md](docs/CONTENT_PIPELINE.md). Multi-model propose → human curate → schema-validate → bake. Produces static content packs.

They meet only at [docs/SCHEMA.md](docs/SCHEMA.md). As long as content validates, the engine runs it — regardless of author.

---

## Status

The engine is built (tickets T-00…T-16 plus the ULTRA hardening pass) and browser-playable; the
10-minute slice in [docs/VERTICAL_SLICE.md](docs/VERTICAL_SLICE.md) is the demo target. The default
browser content set is cataloged in [content/PACKS.md](content/PACKS.md). `pnpm verify` is green. To
work on the repo, follow [AGENTS.md](AGENTS.md); for the current state and next steps, see
[GOAL.md](GOAL.md) and [ROADMAP.md](ROADMAP.md).

---

## Why this ages well

Bigger context windows, better tool use, cheaper image/voice generation, and improving content quality all make this **better over time without architectural change** — because the engine stays small and typed, vendors stay isolated behind interfaces, and the world grows through a pipeline that improves as the models do. We deliberately do **not** bet on multi-agent orchestration, live generation, or any single vendor.
