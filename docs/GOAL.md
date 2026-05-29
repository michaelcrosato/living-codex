# GOAL.md — The Living Codex

> **One-line:** A browser-based, top-down 2D RPG whose **engine is built and evolved by a single autonomous AI coding agent**, and whose **world is grown by humans curating AI-authored story content** that is baked in as static data — never generated live during play.

This file is the north star. If any decision conflicts with this file, **this file wins**. Every other document (`ARCHITECTURE.md`, `AGENTS.md`, schemas, tickets) serves this one.

---

## 1. What we are building

**The Living Codex** is a top-down 2D role-playing game that runs in a web browser. Think of the *feel* of the opening hours of a deep RPG (Shadowrun on SNES, the first hour of Baldur's Gate 3, Disco Elysium's density of choice) delivered through **simple vector graphics and rich text**, not expensive art.

The product is actually **two things that must never be confused**:

1. **The Engine** — a clean, modular, deterministic game engine. This is **written and maintained by one autonomous AI coding agent.** The engine's entire reason for existing is to be *easy for that agent to understand, debug, and extend over years.*
2. **The World** — the actual game content (quests, characters, factions, locations, dialogue, lore). This is **authored offline by frontier LLMs under human curation**, validated against strict schemas, and **shipped as static data files.** It is not code. The engine loads it.

The agent builds the machine. Humans + AI fill the machine with stories. Players experience a world that feels hand-crafted and permanent.

---

## 2. The core thesis

A great RPG is **a story wrapped in an engine.** People do not play Baldur's Gate 3 for the graphics — they play it because *"I can do this, I can do that."* Depth, choice, and consequence are the product. Graphics are a delivery mechanism that can be upgraded later.

This is the regime where today's AI is strongest:
- **Text** — infinite high-quality prose, dialogue, lore, characterization.
- **Code** — a small, well-structured engine an agent can own end to end.
- **(Later) Image & voice** — swappable layers that plug into stable interfaces.

So we deliberately start where AI compounds: **lots of curated text, simple vector visuals, a tiny clean engine.** We let the content carry the experience and upgrade the presentation over time without touching the core.

---

## 3. Hard scope decisions (these are settled — do not relitigate)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **No procedural generation.** | Procedural content existed because LLMs did not. We curate authored content instead — it is higher signal and never feels like filler. |
| 2 | **No runtime/live LLM calls during gameplay.** | Players never interface with an LLM. All content is pre-generated, curated, validated, and baked in as static data. The game runs fully offline-capable in the browser. |
| 3 | **The engine is AI-coded** by **one** autonomous agent (not a swarm). | Keeps the token economy simple and the reasoning paths clean. Multi-agent is explicitly out of scope for now. |
| 4 | **Content is AI-authored, human-curated, then static.** | A repeatable offline pipeline proposes content; a human selects/edits; the engine consumes the approved result. |
| 5 | **Browser-based, top-down 2D.** | Instant access, no install, trivial to share and showcase. |
| 6 | **Vector graphics first; rendering layer is swappable.** | Lightweight art now; AI-generated sprites/voice later **without changing game logic.** |
| 7 | **Maintainability & debuggability beat raw performance.** | We will trade frames for clarity every time. This engine is optimized to be *understood by an agent*, not to be the fastest. |
| 8 | **Determinism is mandatory.** | Same seed + same inputs ⇒ identical state. This is what makes the game replayable, testable, and debuggable by an agent with no human in the loop. |

---

## 4. What "done" looks like for the first milestone (the Showcase)

A **10-minute vertical slice** that makes a first-time player say *"I want more."* Concretely:

- A player opens a URL. No install, no login.
- A cold open establishes mood with vector art + text in under 60 seconds.
- They walk a small, dense district, meet **8–12 NPCs** (authored offline by the pipeline, baked in as data).
- They accept **one branching opening quest** with **at least three viable solutions** (e.g. talk, sneak, fight) — each is a condition check on world state, not a scripted path.
- Their choices have **visible, persistent consequences**: an NPC remembers, a reputation shifts, a later line of dialogue changes.
- It ends on a hook that promises depth ("I heard what you did. We should talk.").

**And** — proving the *other* half of the thesis — the repository demonstrates that:
- The **engine was built by the agent** following the architecture and tickets in this package.
- **At least one full quest line was produced by the content pipeline** (AI-authored, human-curated) and loaded through the *exact same code path* as any hand-authored content.
- Adding a new mechanic (the tickets include one, e.g. "lockpicking" or "faction reputation") took the agent a small, bounded change across a predictable set of files.

The showcase is the framework. The demo proves the machine and the pipeline both work.

---

## 5. Non-negotiable engineering invariants

These exist to keep the codebase **legible to one AI agent indefinitely.** Violating them is a defect even if the game still runs.

1. **One concept per file.** A file does one thing. If you can't summarize a file's job in one sentence, split it.
2. **Small surface area per task.** For any reasonable change, the agent should need to read **≤ 3 files / ≤ ~2,000 lines** to act confidently. Architecture exists to preserve this.
3. **Strict types are law.** TypeScript `strict` mode, no `any`, discriminated unions for variants, branded IDs. Types are the agent's compiler-enforced documentation.
4. **The engine core is pure.** No DOM, no network, no rendering, no vendor SDKs inside the simulation core. It takes data and inputs, returns new state and events.
5. **Vendor isolation.** Exactly one package may import the renderer. Exactly one may import the narrative runtime. The engine core imports none of them.
6. **Content is data, not code.** Every quest, NPC, location, faction, and line of dialogue is a validated data file. Adding content must never require editing engine logic.
7. **Everything is replayable.** Game state is serializable; inputs are an append-only event log; `replay(log)` reproduces any session. Bug reports are deterministic.
8. **Tests are the contract.** New systems ship with tests asserting invariants (e.g. "credits are conserved", "no NPC has negative HP", "every quest references existing entities"). The agent is graded by the test runner.

---

## 6. The two pipelines (mental model)

```
   ┌─────────────────────────────────────────────────────────────┐
   │  PIPELINE A — THE ENGINE (built by ONE AI coding agent)      │
   │  Reads: this package (GOAL, ARCHITECTURE, AGENTS, tickets)   │
   │  Produces: a deterministic, modular, browser TS game engine  │
   │  Grows: new systems/mechanics as curated content demands     │
   └─────────────────────────────────────────────────────────────┘
                              ▲ loads
                              │ (validated static data only)
   ┌─────────────────────────────────────────────────────────────┐
   │  PIPELINE B — THE WORLD (AI-authored, human-curated, static) │
   │  Reads: the world bible + current canon                      │
   │  Multi-model propose → human curate → schema-validate → bake │
   │  Produces: versioned content packs (quests, NPCs, lore...)   │
   └─────────────────────────────────────────────────────────────┘
```

Pipeline A and Pipeline B meet **only** at the content schema. The schema is the treaty between them. As long as content validates against the schema, the engine does not care whether a human or a model wrote it.

---

## 7. Forward bet (why this ages well 2–3 years out)

- Agent context windows and tool-use keep improving — but **attention still degrades with prompt size**, so "small, named, typed modules" wins regardless of context size.
- LLM content quality and structured-output reliability keep improving — so the **curation pipeline gets better for free** without engine changes.
- Image/voice generation gets cheap and fast — so we keep the **render and audio layers behind stable interfaces** and swap implementations later.
- We **do not** bet on multi-agent orchestration, live generation, or any single LLM vendor. Those are explicitly deferred or isolated.

---

## 8. How to use this package

If you are the coding agent: read in this order — `GOAL.md` (this file) → `AGENTS.md` → `ARCHITECTURE.md` → `WORLD_STATE.md` → `SCHEMA.md` → `TICKETS.md`. Build ticket by ticket. Each ticket has acceptance tests. Do not skip ahead. When in doubt, re-read §3 and §5 here. Note: T-00 (toolchain scaffolding) may be set up by a human so you start in a green workspace (`TICKETS.md` Phase 0 note) — from T-01 on, assume the environment is correctly configured and the engine is yours to build.

If you are a human operator: use `CONTENT_PIPELINE.md` to run a content cycle, and `WORLD_BIBLE.md` to keep canon coherent.
