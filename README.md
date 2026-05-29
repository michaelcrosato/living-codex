# The Living Codex — Build Package

A complete, self-contained specification for **one autonomous AI coding agent** to build a browser-based, top-down 2D RPG whose **engine is AI-coded** and whose **world is AI-authored, human-curated, and baked in as static content.**

This folder is the entire brief. Hand it to the agent and start at T-00.

---

## Read order

| # | File | What it is | Audience |
|---|------|------------|----------|
| 1 | **GOAL.md** | North star: vision, hard scope, invariants. Wins all conflicts. | Everyone |
| 2 | **AGENTS.md** | Terse operating manual: commands, never-do list, definition of done. | The agent (keep open) |
| 3 | **ARCHITECTURE.md** | Stack, package graph, the pure core, determinism, enforcement. | The agent |
| 4 | **WORLD_STATE.md** | The runtime state contract: `World` shape, replay envelope, quest semantics, player model. | The agent |
| 5 | **SCHEMA.md** | The content treaty (Zod/TS) — the seam between engine and world. | Agent + pipeline |
| 6 | **TICKETS.md** | The sequenced, acceptance-tested build plan (T-00 … T-16). | The agent |
| 7 | **AGENT_GUIDES.md** | Recipes for common tasks (add a system, add content, evolve schema, debug). | The agent |
| 8 | **CONTENT_PIPELINE.md** | The offline, human-guided, multi-model content workflow (Pipeline B). | Human operator |
| 9 | **WORLD_BIBLE.md** | Canon format (incl. the canon layers) + the "Ashfall" starter setting. | Operator + pipeline |
| 10 | **VERTICAL_SLICE.md** | The 10-minute "wow" demo, beat by beat. The first milestone's target. | Everyone |

---

## The idea in five sentences

1. A great RPG is a story wrapped in an engine; players come for depth and choice, not graphics — which is exactly where AI is strongest.
2. So we build a tiny, clean, deterministic engine that **one AI agent can own indefinitely**, and we pour **curated AI-authored text content** into it.
3. **No procedural generation, no live LLM calls** — content is proposed by an ensemble of frontier models, chosen by a human, validated against a strict schema, and shipped as static data.
4. Start with **vector graphics and text**; the render and audio layers are behind stable interfaces so AI-generated art and voice can be swapped in later without touching game logic.
5. The showcase is a **10-minute slice** that makes players say "I want more" — and a repo that proves the agent built the engine and the pipeline grew the world.

---

## The two pipelines (never confuse them)

- **Pipeline A — the Engine.** Built by the agent from `TICKETS.md`. Pure, modular, deterministic TypeScript. Grows new mechanics as content demands them.
- **Pipeline B — the World.** Run by a human operator from `CONTENT_PIPELINE.md`. Multi-model propose → human curate → schema-validate → bake. Produces static content packs.

They meet only at `SCHEMA.md`. As long as content validates, the engine runs it — regardless of author.

---

## Kickoff (what to tell the agent)

> Read `GOAL.md`, then `AGENTS.md`, then `ARCHITECTURE.md`, then `WORLD_STATE.md`, then `SCHEMA.md`. Then begin `TICKETS.md` at **T-00** (which a human may have already scaffolded for you) and proceed in order. After each ticket, run `pnpm verify` and confirm the ticket's acceptance criteria before moving on. Use the recipes in `AGENT_GUIDES.md` for routine work. Honor every invariant in `GOAL.md §5` and every rule in `AGENTS.md` — they exist to keep your context small and your reasoning simple. If *understanding* a task seems to need reading far more than ~3 files, stop and flag it (editing a predictable handful of files for a cross-cutting change is normal and fine).

The first milestone is the experience described in `VERTICAL_SLICE.md`, proven by tickets T-13 through T-14c, with T-15 assembling/instrumenting the slice and T-16 demonstrating clean extensibility.

---

## Why this ages well

Bigger context windows, better tool use, cheaper image/voice generation, and improving content quality all make this **better over time without architectural change** — because the engine stays small and typed, vendors stay isolated behind interfaces, and the world grows through a pipeline that improves as the models do. We deliberately do **not** bet on multi-agent orchestration, live generation, or any single vendor.
