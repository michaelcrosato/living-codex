# TICKETS.md — The Build Plan

Sequenced work for **one** autonomous coding agent. Build in order; each ticket has acceptance criteria and ends green on `pnpm verify`. Don't skip ahead — later tickets assume earlier invariants hold.

Conventions: every ticket lists the **files it may touch** (small blast radius by design, `GOAL.md §5.2`). If you find yourself needing files outside the list, stop and note why before proceeding.

---

## Phase 0 — Foundation

> **Scaffolding note (read once).** T-00 is pure monorepo configuration (pnpm workspaces, strict tsconfig, ESLint, dependency-cruiser, Vitest). Today's CLI agents are far better at writing game logic than at blindly bootstrapping zero-to-one toolchain config. **It is acceptable — often preferable — for a human to scaffold T-00** (or to start from a known-good template) so the agent begins T-01 in a green, correctly-configured workspace. If the agent does T-00, it should treat the configs as high-risk and verify `pnpm verify` runs (vacuously) green before proceeding. Either way: once T-00 is green, the agent owns T-01 onward and may assume the environment is correctly configured.

### T-00 · Monorepo skeleton
**Goal:** Empty but correct workspace.
**Touch:** repo root, `pnpm-workspace.yaml`, `tsconfig.base.json`, per-package `package.json` + `src/index.ts` stubs for all packages in `ARCHITECTURE.md §2`, ESLint/Prettier configs, `dependency-cruiser` config, Vitest config, the `pnpm verify` script.
**Done when:**
- `pnpm install` succeeds; `pnpm typecheck`, `pnpm lint`, `pnpm test` all run (vacuously) green.
- `tsconfig` has `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`.
- `dependency-cruiser` rules encode the dependency graph in `ARCHITECTURE.md §2` and the bans in `AGENTS.md`.
- Each package has a one-paragraph `README.md`.

### T-01 · Determinism primitives
**Goal:** The single RNG and clock.
**Touch:** `engine-core/src/time/rng.ts`, `time/clock.ts`, colocated tests.
**Done when:**
- `rng.ts` exposes a seeded PRNG; same seed ⇒ identical sequence (test).
- `no-restricted-globals` lint bans `Math.random`/`Date.now` in `engine-core`.
- `clock.ts` provides a fixed-timestep stepping helper (test for stable dt).

---

## Phase 1 — The content treaty

### T-02 · Content schema
**Goal:** Implement `SCHEMA.md` exactly.
**Touch:** `content-schema/src/{ids,location,npc,quest,effect,faction,item,condition,pack}.ts`, `index.ts`, tests.
**Done when:**
- All schemas from `SCHEMA.md` exist as Zod with inferred types and branded IDs.
- A `zod-to-json-schema` export produces JSON Schema for the pipeline (`pnpm schema:export`).
- Tests: valid example (`SCHEMA.md §9`) parses; malformed variants reject with clear errors.

### T-03 · Content loader + referential integrity
**Goal:** Turn packs into frozen registries; fail loudly on bad references.
**Touch:** `content-loader/src/{load,validate,integrity,registries}.ts`, `index.ts`, tests.
**Done when:**
- Loads packs in `dependsOn` order, Zod-validates each.
- Referential-integrity pass resolves every referenced ID; a dangling reference fails with the offending id + pack (test with a deliberately broken pack).
- Output is the `Registries` shape from `ARCHITECTURE.md §4`, frozen/readonly.

---

## Phase 2 — The pure core

### T-04 · World state, events, replay
**Goal:** The state machine spine + the replay guarantee. Implement the contract in `WORLD_STATE.md` exactly.
**Touch:** `engine-core/src/state/{world,snapshot}.ts`, `events/{event,apply,log}.ts`, tests.
**Done when:**
- `World` matches `WORLD_STATE.md §1` and is fully JSON-serializable plain data (no class instances/Maps/Sets/closures — the flat-data rule, `WORLD_STATE.md §6`).
- `applyEvent(world, ev)` is pure, total, exhaustive over the `Event` union, and enforces the bounds in `WORLD_STATE.md §5` (no negative inventory; reputation clamped to `[-100,100]`).
- The replay log uses the `ReplayLog` / `SaveEnvelope` shapes in `WORLD_STATE.md §7`, including the `contentFingerprint` header. `replay` warns/refuses on fingerprint mismatch (test both).
- **Snapshot model:** saves are `{ snapshot, logSinceSnapshot }`; loading replays only the tail (test that a mid-game snapshot + tail equals full replay).
- `serialize`/`deserialize`/`hash` round-trip (test).
- **Replay invariant test (permanent):** for a generated seeded log, `hash(replay(log, seed)) === hash(foldedLiveWorld)`. Wired into `pnpm replay:verify` and therefore `pnpm verify` from here on. Never delete it.
- The tick order in `WORLD_STATE.md §8` is implemented as the single public loop helper.

### T-05 · ECS (derived) + conditions
**Goal:** Entity *query* layer and the safe expression language.
**Touch:** `engine-core/src/ecs/{components,registry}.ts`, `conditions/conditions.ts`, tests.
**Done when:**
- ECS is a **derived query layer over `World`**, rebuilt from / wrapping world data — it is NOT the source of truth and no system mutates ECS entities (`WORLD_STATE.md §6`). Test: a query reflects world state and survives a serialize/deserialize round-trip.
- Components for the slice defined as plain data (position, hp, interactive, dialogue-ref, faction-standing reference).
- `evaluate(world, condition)` implements every kind in `SCHEMA.md §7`, pure and exhaustive (test each kind incl. nested `all/any/not`).

### T-06 · Movement + interaction systems
**Goal:** Walk around; detect "talk to" and "use exit."
**Touch:** `engine-core/src/systems/{movement,interaction}.ts`, tests.
**Done when:**
- Movement system advances position from input deterministically.
- Interaction system emits `Interact`/`UseExit` events on proximity (test with fixed positions).
- Exit `requires` conditions gate transitions (test a locked exit).

---

## Phase 3 — Narrative & quests

### T-07 · Narrative interface + Ink adapter (with determinism reconciliation)
**Goal:** Branching dialogue, story vars mirrored to world flags, **Ink captured for replay.**
**Touch:** `narrative-ink/src/{adapter,session}.ts`, `index.ts`; `engine-core/src/systems/dialogue.ts` (consumes the `Narrative` port, never imports inkjs); tests.
**Done when:**
- `Narrative`/`StorySession` per `ARCHITECTURE.md §5` implemented over inkjs; ports are defined in `engine-core`, implemented here (import direction per `ARCHITECTURE.md §5`).
- **Every choice emits a `DialogueAdvanced` event carrying the full serialized Ink state (`save()`), and that snapshot lands in the event log. Replay restores Ink via `load()`; it never re-runs Ink.** Test: a dialogue containing Ink `RANDOM()` replays to an identical world hash (this is the determinism reconciliation, `WORLD_STATE.md §4`).
- Story vars in `declaredVars` mirror into `World.flags` so conditions can read them (test).
- `dependency-cruiser` confirms inkjs is imported only in `narrative-ink`.

### T-08 · Quest system (with first-class failure)
**Goal:** Offer, track multi-branch, complete atomically, handle failure.
**Touch:** `engine-core/src/systems/quests.ts`, tests.
**Done when:**
- Implements `QuestRuntimeState` and the rules in `WORLD_STATE.md §2`: ordered objectives by default, one branch completes, completion is **atomic and idempotent** (branch `onComplete` → quest `onAnyComplete` → rewards, each once via `appliedEffectIds`).
- A quest is offered when `offerWhen` holds; appears in journal state.
- **Failure is real:** a failed `skill_check` applies its `onFail` effects; a branch that becomes impossible applies its `onFail` and closes; a quest enters `failed` only when all branches are foreclosed (test the persuade-fail fall-through from `SCHEMA.md §9`).
- `SCHEMA.md §9` warehouse quest is fully driveable in tests through **all three branches**, each producing the correct distinct state (esp. the reputation hit on `force` and the `guard_suspicious` flag on failed persuade).
- Idempotency test: replaying a completion never double-applies rewards.

### T-09 · Player model, skill checks, reputation, minimal combat
**Goal:** The character the agency thesis depends on, plus the verbs the slice needs.
**Touch:** `engine-core/src/state/character.ts`, `engine-core/src/systems/{skillcheck,reputation,combat}.ts`, tests.
**Done when:**
- `CharacterState` per `WORLD_STATE.md §3` lives in `World.player`: skills + situational `conditionMods`. The `modify_skill` effect adjusts mods (so a bar tip grants `+2 persuade`).
- Skill check resolves `roll(1..20) + skill + conditionMods >= dc` using the **single** RNG (deterministic under seed; test). On failure it routes to the objective's `onFail` (T-08).
- Test the thesis end to end: a flag set by a patron's dialogue raises a `conditionMod` that flips an otherwise-failing persuade check to success.
- Reputation standing lives in `World.reputation` (clamped per `WORLD_STATE.md §5`); `adjust_reputation` applies; `reputation_at_least` reads it (test).
- Combat is the **minimum** to satisfy a `defeat` objective deterministically. No more. (A future ticket may deepen it; don't pre-build.)

---

## Phase 4 — Presentation & shell

### T-10 · Renderer interface + Pixi vector implementation
**Goal:** Draw the world with vectors.
**Touch:** `render-pixi/src/{renderer,camera}.ts`, `index.ts`; tests where feasible.
**Done when:**
- `Renderer` per `ARCHITECTURE.md §5` implemented in PixiJS using `Graphics`.
- `drawSprite` exists as a **no-op** (sprite layer is future work).
- Renders `VectorShape[]` from a `Location`; camera follows the player.
- `dependency-cruiser` confirms pixi.js is imported only in `render-pixi`.

### T-11 · Persistence + audio stub
**Goal:** Save/load and the silent audio seam.
**Touch:** `persistence/src/{save,load,replaylog}.ts`; `engine-core/src/audio.ts` (the `AudioOut` interface + no-op); tests.
**Done when:**
- Save/load via IndexedDB (`idb-keyval`); world exports/imports as JSON.
- The replay log persists and reloads; replay still reproduces state.
- `AudioOut` interface exists; default impl is a no-op. No TTS yet.

### T-12 · App composition root + the loop
**Goal:** Wire it together into a playable shell.
**Touch:** `app-web/src/{main,bootstrap,loop,input}.ts`, `index.html`, Vite config; `app-web/test/smoke.spec.ts`.
**Done when:**
- `pnpm dev` boots a browser build that loads `content/core` + `content/generated`, renders the start location, accepts input, runs the fixed-timestep loop, and routes dialogue/quests.
- This is the composition root: the **only** place that imports render, narrative, loader, persistence together.
- **A browser smoke test (Playwright or Vitest browser mode)** asserts, automatically: app loads, start location renders, a movement input changes player position, first NPC interaction opens dialogue, accepting the warehouse quest updates the journal, and an exported replay log exists. This is where integration bugs concentrate, so it is not left manual.

---

## Phase 5 — Content & the slice

### T-13 · Hand-authored opening pack (the control)
**Goal:** Prove a human can author against the schema.
**Touch:** `content/core/pack.opening/**` (data + compiled Ink), no engine code.
**Done when:**
- Start from the minimal valid `pack.starter` in `SCHEMA.md §11`, then expand to the full slice: the 5 locations, 2 factions, 3 principal NPCs, the drive item, `quest.the_warehouse` (all three branches incl. the persuade-fail fall-through), and principal dialogues. Passes `pnpm content:validate` **and** `pnpm content:verify` (solvable).
- The slice is playable from cold open through accepting the quest using only this pack.

### T-14a · Pipeline skeleton (offline tooling)
**Goal:** A runnable Pipeline B shell.
**Touch:** `tools/pipeline/**` (offline only; never shipped to browser).
**Done when:**
- Stack: TS run via `tsx` (Node), separate from the game build. A `pnpm pipeline:cycle --brief "…"` CLI exists.
- A provider-agnostic adapter `generateStructured<T>(schema, prompt)` with **one real provider** plus stubs. (Recommended default: a unified router like OpenRouter so swapping the Architect/Dramatist/Critic models is config, not code — but the adapter abstraction is what matters, not the specific router.)
- `pnpm pipeline:export` writes the canon export + `content/canon-index.json` (`WORLD_BIBLE.md §A.2`).
- `tools/pipeline/prompts/` holds the role system-prompts and example briefs (`CONTENT_PIPELINE.md §3, §5`).

### T-14b · Schema-constrained proposal + curation artifact
**Goal:** Turn a brief into validated, reviewable proposals.
**Touch:** `tools/pipeline/**`.
**Done when:**
- The cycle decomposes a brief into the role sub-tasks (`CONTENT_PIPELINE.md §4`), each emitting JSON validated against the exported JSON Schema; failed validations auto-repair up to N tries, then flag for human.
- Output is a **curation bundle**: proposals + a Critic scorecard + flagged contradictions, written as a simple reviewable artifact (a static HTML side-by-side page and/or a JSON+markdown bundle with accept/reject/edit fields). A full UI is not required for the milestone.
- A **golden-master test:** for a fixed brief + stubbed model outputs + seed, the assembled candidate pack matches an expected structure/hash (protects pipeline determinism).

### T-14c · Bake + same-path integration
**Goal:** Approved content becomes a real, identically-loaded pack.
**Touch:** `tools/pipeline/**`, `content/generated/pack.the_drip_patrons/**`.
**Done when:**
- One cycle produces 8–12 patrons + the hook NPC, schema-valid, with full provenance (`SCHEMA.md §8`), written to `content/generated/`.
- The canon index updates; `pnpm content:validate` and `pnpm content:verify` pass.
- **Same-path proof:** an integration test loads `pack.opening` and `pack.the_drip_patrons` through the identical `content-loader` path with **zero engine special-casing** — the milestone criterion (`GOAL.md §4`).

### T-15 · Assemble & instrument the vertical slice
**Goal:** The full 10-minute experience in `VERTICAL_SLICE.md`.
**Touch:** `app-web` glue, content wiring, lightweight instrumentation.
**Done when:**
- All beats in `VERTICAL_SLICE.md §2` play end to end.
- All three warehouse solutions are reachable and produce distinct, persistent consequences (incl. the bar patron's changed reaction after a forced entry, and the changed line after a failed persuade).
- The closing hook fires.
- The demo session's event log replays to an identical state hash (`replay` proof for the actual demo run, fingerprint-matched).
- **Measurable acceptance (instrument the first 10 min, ≥5 first-time testers):** ≥70% reach the warehouse without intervention; ≥60% complete the quest; ≥2 of 3 branches are discovered across the cohort; ≥70% correctly notice at least one persistent consequence; mean "want to continue" ≥ 4/5; every recorded run's replay reproduces its final state hash. If testers bounce, the fix is **more/deeper content, not more engine** (`VERTICAL_SLICE.md §5`).

---

## Phase 6 — Prove extensibility (the showcase's other half)

### T-16 · Add a new mechanic from a content need
**Goal:** Demonstrate the agent extends the engine cleanly when curated content asks for a verb that doesn't exist yet.
**Example:** "bribe a faction" — a new `Effect`/`Event` + a `systems/bribe.ts` + a schema entry + a condition, following `docs/agent-guides/adding-a-system.md`.
**Touch (expected, small):** `content-schema/src/effect.ts`, `engine-core/src/events/event.ts` + `apply.ts`, one new `systems/*.ts`, its test, and a content pack that uses it.
**Done when:**
- The new verb works end to end, all gates green.
- The change touched a **small, predictable** set of files — recorded as evidence for the showcase that adding mechanics is bounded and legible.

---

## Notes on sequencing & risk
- **T-04's replay test is load-bearing.** If it ever fails, fix it before anything else — it's the foundation of agent-driven debugging.
- Phases 1–3 are pure and have no browser dependency; they're the fastest to test and the safest to build first.
- The browser shell (Phase 4) is intentionally last among the engine phases so most logic is proven headless before rendering exists.
- T-16 is the proof that the architecture delivers on its promise. Don't cut it — it's half the showcase (`GOAL.md §4`).
