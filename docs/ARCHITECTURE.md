# ARCHITECTURE.md — The Living Codex Engine

This document defines **how the engine is built** so that one autonomous AI coding agent can own it indefinitely. It is subordinate to `GOAL.md`. Read that first.

The governing principle from `GOAL.md §5`: **for any reasonable task, the agent should read ≤ 3 files / ≤ ~2,000 lines to act confidently.** Every choice below serves that.

---

## 1. Stack (chosen and locked)

| Layer | Choice | Why this, for an AI agent |
|-------|--------|---------------------------|
| Language | **TypeScript 5.x, `strict`** (+ `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`) | Types are compiler-enforced docs the agent self-corrects against. No `any`. |
| Package manager | **pnpm workspaces** | Small packages with explicit boundaries; the agent can hold one package in context. |
| Build / dev | **Vite** + `tsx` for scripts | Zero-config TS, fast HMR, ESM-first. |
| Rendering | **PixiJS 8** behind a `Renderer` interface (NOT Phaser — see note) | WebGL 2D; vector via `Graphics` now, sprites later — same interface. Only ONE package imports it. |
| ECS | **Miniplex** | Array-of-structs ECS optimized for readability over raw speed. Clear data shape. |
| Narrative runtime | **Ink** via **inkjs** behind a `Narrative` interface | Proven branching-story VM (80 Days, Heaven's Vault). Compiles to JSON bytecode. Only ONE package imports it. |
| Content validation | **Zod** (runtime) → **JSON Schema** (for the pipeline) | One schema definition, runtime-validated, and exportable to constrain LLM output. |
| Persistence | **IndexedDB** via `idb-keyval` | Browser-native, serializable, exportable as JSON for replay. |
| Testing | **Vitest** + **fast-check** (property tests) | Determinism is testable: same seed ⇒ same state hash. |
| Lint / format | **ESLint + Prettier** (locked configs) | Never let the agent debate style. Deterministic tooling. |

> If a library choice ever blocks the agent, the **interface stays and the implementation swaps**. Interfaces are assets; implementations are variables.

> **Renderer decision — Pixi, not Phaser (locked, do not relitigate).** Phaser bundles scenes, input, camera, and Arcade physics, which is convenient — but it also bakes in framework assumptions about *how a game is structured*. We deliberately reject that: our simulation is the pure `engine-core`, and rendering is a thin, swappable `Renderer`. Pixi is a *pure 2D draw layer* with no opinion about game structure, which makes (a) the vector→sprite→AI-art transition a zero-cost reimplementation of the same interface, and (b) the engine/render boundary trivially enforceable. Input/camera/loop live in `app-web` and `engine-core`, not in a framework. We pay a little convenience now to keep the boundary clean for years. If sprite-era needs ever justify Phaser, it can be introduced *behind the same `Renderer` interface* without touching game logic.

---

## 2. Package graph

```
packages/
  engine-core/        # PURE simulation. No DOM, no fetch, no vendor SDKs. The heart.
  content-schema/     # Zod schemas + branded ID types + JSON Schema export. The treaty.
  content-loader/     # Validates + indexes content packs into in-memory registries.
  narrative-ink/      # The ONLY package that imports inkjs. Implements Narrative iface.
  render-pixi/        # The ONLY package that imports pixi.js. Implements Renderer iface.
  persistence/        # IndexedDB save/load + the replay event log.
  app-web/            # Entry point. Wires everything together. The composition root.
tools/
  pipeline/           # OFFLINE content pipeline (Pipeline B). Never shipped to browser.
content/
  core/               # Hand-authored "vanilla" content pack (the control).
  generated/          # AI-authored, human-curated, validated packs.
docs/
  GOAL.md  ARCHITECTURE.md  AGENTS.md  CONTENT_PIPELINE.md  WORLD_BIBLE.md  TICKETS.md
  agent-guides/       # Step-by-step recipes the agent follows for common tasks.
```

**Dependency rule (enforced, see §7):**

```
app-web ──► engine-core ──► content-schema
   │              ▲
   ├──► render-pixi (Renderer)        content-loader ──► content-schema
   ├──► narrative-ink (Narrative)              ▲
   ├──► content-loader ────────────────────────┘
   └──► persistence

engine-core depends on content-schema ONLY. It must never import render, narrative,
persistence, pixi, inkjs, or the DOM. This is what keeps the core pure and testable.
```

---

## 3. The engine core (the part that must stay pristine)

`engine-core` is a **pure state machine**. It knows nothing about how things look, sound, or persist.

```
engine-core/src/
  index.ts              # Public API surface ONLY (re-exports). Agent reads this first.
  time/
    clock.ts            # Fixed-timestep tick. Deterministic dt.
    rng.ts              # Seeded PRNG. The ONLY source of randomness in the whole game.
  state/
    world.ts            # The World type: the complete serializable game state.
    snapshot.ts         # serialize(world) / deserialize(json) / hash(world).
  ecs/
    components.ts       # Component definitions (Position, Stats, Interactive, ...).
    registry.ts         # Miniplex world wrapper + typed queries.
  systems/
    movement.ts         # (world, dt) => Event[]   pure
    interaction.ts      # proximity + "talk to" detection
    dialogue.ts         # advances narrative state from choices
    combat.ts           # turn resolution (added by a ticket, not day one)
    reputation.ts       # faction standing (added by a ticket)
  events/
    event.ts            # The discriminated-union Event type. The engine's vocabulary.
    apply.ts            # applyEvent(world, event) => world   pure, total, exhaustive
    log.ts              # append-only event log + replay(log, seed) => world
  conditions/
    conditions.ts       # evaluate(world, expr) => boolean. Powers quest gating.
```

### The simulation contract
```ts
// Every system is a pure function of this shape:
type System = (world: World, dt: number) => Event[];

// Events are the ONLY way the world changes:
function applyEvent(world: World, ev: Event): World; // pure, returns new state

// A tick: run systems → collect events → fold them into new state → log them.
function tick(world: World, inputs: Input[], dt: number): { world: World; events: Event[] };
```

Because the world only ever changes by applying logged events, **the entire game is replayable** from `(seed, eventLog)`. This is the single most important debugging affordance in the project (`GOAL.md §5.7`).

---

## 4. The seam between engine and content

`engine-core` never reads files. It is *handed* already-validated registries by `content-loader`. The flow:

```
content/*/  ──(content-loader)──►  validate via content-schema  ──►  Registries
                                                                        │
                                              engine-core consumes ◄────┘
                                              registries as plain typed data
```

A **Registry** is just an indexed, frozen map of content by branded ID:

```ts
interface Registries {
  npcs: ReadonlyMap<NpcId, Npc>;
  quests: ReadonlyMap<QuestId, Quest>;
  locations: ReadonlyMap<LocationId, Location>;
  factions: ReadonlyMap<FactionId, Faction>;
  items: ReadonlyMap<ItemId, ItemTemplate>;
  dialogues: ReadonlyMap<DialogueId, CompiledInk>;
}
```

If content references a missing ID, the loader **fails loudly at load time**, never at play time. (See `content-loader` referential-integrity check.)

---

## 5. The two swappable interfaces (vendor isolation)

> **Port ownership & import direction (settled).** The `Renderer`, `Narrative`, and `AudioOut` interfaces ("ports") are **defined in `engine-core`** (a tiny `ports/` module with zero dependencies). Implementation packages (`render-pixi`, `narrative-ink`) **depend on `engine-core`'s port types**; `engine-core` never depends on them. `app-web` is the only package that imports both the ports and their concrete implementations and injects the implementations in. This keeps dependencies pointing inward (toward the pure core) and makes vendor isolation enforceable without a separate ports package.

### Renderer (only `render-pixi` implements it today)
```ts
interface Renderer {
  begin(camera: Camera): void;
  drawPath(points: Vec2[], style: Stroke & Fill): void;
  drawCircle(c: Vec2, r: number, style: Stroke & Fill): void;
  drawText(pos: Vec2, text: string, style: TextStyle): void;
  drawSprite(id: SpriteId, pos: Vec2, opts?: SpriteOpts): void; // no-op until sprites exist
  end(): void;
}
```
The engine emits **draw intents** (or the app reads world state and calls these). To move to AI-generated sprite art later, implement `Renderer` in a new `render-sprite/` package and change **one import** in `app-web`. Game logic does not change. (`GOAL.md §3.6`.)

### Narrative (only `narrative-ink` implements it today)
```ts
interface Narrative {
  load(compiled: CompiledInk): StorySession;
}
interface StorySession {
  current(): { text: string; tags: string[]; choices: Choice[] };
  choose(choiceIndex: number): void;
  getVar(name: string): string | number | boolean;
  setVar(name: string, v: string | number | boolean): void;
  save(): string;   // serialize FULL ink state (state.toJson) — captured into the event log
  load(s: string): void;  // restore ink state verbatim; never recompute
}
```
Story variables are mirrored into `World.flags` so quests can gate on them deterministically. **Crucially, `save()` captures complete Ink state on every choice and that snapshot lands in the event log — replay restores it rather than re-running Ink.** This reconciles Ink's internal RNG with our single-RNG rule (see §6 and `WORLD_STATE.md §4`).

### Audio (stub now, real later)
```ts
interface AudioOut { speak(line: VoiceLine): void; play(sfx: SfxId): void; } // no-op stub
```
Voice is a **future plug-in**. The interface exists from day one so adding TTS later is additive.

---

## 6. Determinism model (non-negotiable)

1. **One RNG.** `rng.ts` exposes a single seeded PRNG. No `Math.random()` anywhere — lint rule forbids it. `rngState` is serialized into `World` so replay resumes mid-stream.
2. **Fixed timestep.** Simulation advances in fixed `dt`; rendering interpolates but never drives state.
3. **Inputs are events.** Player input becomes typed log entries per tick; the canonical envelope and tick order are in `WORLD_STATE.md §7–§8`.
4. **State is a value.** `World` is plain serializable data — no class instances, Maps, Sets, functions, or closures (the flat-data rule, `WORLD_STATE.md §6`). Its exact shape is defined in `WORLD_STATE.md §1`.
5. **Ink is captured, not recomputed.** Ink has its own internal RNG, so re-running it on replay would diverge. Instead, every dialogue choice snapshots full Ink state into the event log; replay **restores** that snapshot. This is the one place the "single RNG" rule meets a second state machine, and it is resolved by capture. (`WORLD_STATE.md §4`.)
6. **Replay is content-version-relative.** The event log carries a `contentFingerprint` (pack ids + versions + a hash of the resolved registries). `replay` refuses/warns on mismatch, because the world grows over time and a log recorded against older content is not guaranteed to reproduce. (`WORLD_STATE.md §7`.)
7. **Snapshot, don't replay-from-zero.** Saves are `{ snapshot, logSinceSnapshot }`; loading replays only the tail. (`WORLD_STATE.md §7`.)
8. **Replay is sacred.** `hash(replay(log, seed)) === hash(liveWorld)` must always hold. There is a permanent test for it (`TICKETS.md` T-04), and it runs in `pnpm verify` from the first ticket onward.

This is why we accept the performance cost of flat state and event folding: it buys an agent the ability to **reproduce any bug from a saved log without a human.**

---

## 7. Enforcement (so the agent can't accidentally rot the architecture)

These are CI gates, not suggestions:

- **`dependency-cruiser`** config forbids illegal imports (e.g. `engine-core` importing `pixi.js`, the DOM, or `node:*`). Build fails on violation.
- **ESLint rules:** `no-restricted-imports` (no vendor SDKs outside their home package), `no-restricted-globals` (`Math.random`, `Date.now` banned in `engine-core` — time comes from the clock).
- **`tsc --noEmit`** must pass with zero errors. No `// @ts-ignore` without an adjacent `// reason:` comment.
- **File-size soft cap:** a lint warning at 400 lines, hard review flag at 600. Split before exceeding (`GOAL.md §5.1`).
- **Coverage gate:** every `systems/*` and `conditions/*` file requires a colocated `*.test.ts`.
- **Content solvability gate:** `pnpm content:verify` runs a static reachability pass — every quest has ≥1 branch whose objectives are jointly satisfiable from initial state, every `unlock_exit` index exists, every gated condition is reachable. Schema-valid ≠ playable; this catches unwinnable content the Zod pass cannot.
- **Replay gate:** `pnpm replay:verify` runs the permanent replay invariant (and, when present, replays the last saved session). Part of `pnpm verify` from T-01 on.

---

## 8. Performance posture

We optimize for legibility. Concretely:
- Vector scenes target **≤ ~500 active visual entities** in the slice. If a frame is heavy, **draw fewer shapes** — do not complicate the architecture.
- Hot loops may later move to `bitECS` *behind the same system signatures* if and only if a profiler proves a bottleneck. Default is Miniplex.
- Never pre-optimize. A ticket must cite a profile before any perf-motivated complexity is added.

---

## 9. Directory conventions

- Every package has: `package.json`, `README.md` (one paragraph: what it does + its public API), `src/index.ts` (public surface only).
- One exported concept per file; filename = concept (`movement.ts` exports the movement system).
- Tests are colocated: `movement.ts` ↔ `movement.test.ts`.
- No barrel files except each package's single `index.ts`.
- Public types live next to their usage, not in a giant `types.ts` god-file.

---

## 10. What the agent reads for a typical task

> *"Add a lockpicking skill check to quests."*

The agent should need only:
1. `content-schema/src/quest.ts` (add the objective variant)
2. `engine-core/src/systems/interaction.ts` or a new `systems/skillcheck.ts` (resolve it)
3. `docs/agent-guides/adding-a-system.md` (the recipe)

Three files. That is the architecture working as designed.
