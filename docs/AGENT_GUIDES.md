# AGENT_GUIDES.md — Task Recipes

The recipes `AGENTS.md` points to. Each tells you the **exact small set of files** to touch and the test to add, so you never scan the repo for a routine task. (Split these into `docs/agent-guides/*.md` if you prefer one file per recipe.)

---

## Recipe 1 — Adding a system

A "system" is a pure function `(world, dt) => Event[]` that reads world state and proposes changes via events.

**Steps:**
1. **Decide the events it emits.** If they're new, add them to `engine-core/src/events/event.ts` (one new variant of the `Event` union) and handle them in `events/apply.ts` (one new exhaustive switch arm). Adding an arm should make `tsc` force you to handle it everywhere — good.
2. **Write the system** in `engine-core/src/systems/<name>.ts`. Pure. Reads world, returns events. No DOM, no RNG except via `time/rng.ts`, no time except via the clock.
3. **Register it** in the tick order (wherever systems are sequenced in the core's public loop helper). Order matters and is explicit.
4. **Test it** in `systems/<name>.test.ts`: set up a `World`, run the system, assert the emitted events and the post-`applyEvent` state. Add at least one **invariant** property test if the system touches a conserved quantity (credits, hp).
5. `pnpm verify`.

**Files touched:** `events/event.ts`, `events/apply.ts`, `systems/<name>.ts`, `systems/<name>.test.ts` — about four. A cross-cutting verb that also needs a schema entry and a content pack will touch ~6, and that is fine (`AGENTS.md` "read vs touch"). The smell to watch for is not *editing* several files — it's needing to *read* the whole repo to understand the change. If the change is localized in concept but spans a predictable handful of files, you're doing it right.

---

## Recipe 2 — Adding or extending content

Content is **data**, never code. You are producing/editing files under `content/` that validate against `content-schema`.

**Steps:**
1. **Find the schema** for what you're adding in `content-schema/src/` (e.g. `quest.ts`). Read it — it is the contract.
2. **Write the data** as JSON in the appropriate pack under `content/core/` (hand-authored) or `content/generated/` (pipeline output). Use existing IDs for references; invent new dotted IDs for new entities.
3. **If you need a verb that doesn't exist** (an objective kind, an effect, a condition), STOP. That's not a content task — it's an engine ticket. Add it to the schema *and* the engine first (Recipe 1 + a schema entry), then author the content. Never smuggle behavior into data.
4. **Validate:** `pnpm content:validate`. Fix any Zod or referential-integrity errors (the error names the offending id/pack).
5. `pnpm verify`.

**Files touched:** files under one `content/<pack>/` directory. Zero engine files for pure content. If you touched engine code, it wasn't a content task.

---

## Recipe 3 — Extending the renderer

The engine speaks to rendering only through the `Renderer` interface. Vector now; sprites/effects later.

**Steps:**
1. **Add the capability to the interface** in `render-pixi/src/renderer.ts` only if it's genuinely new (e.g. a new shape). Keep the interface small and primitive.
2. **Implement it** in the same package using PixiJS. This is the **only** package allowed to import `pixi.js`.
3. **Do not** leak Pixi types across the interface boundary — the engine/app see only plain `Vec2`/style data.
4. For the eventual sprite/AI-art layer: **do not modify `render-pixi`.** Create a new `render-sprite/` package implementing the same `Renderer`, and change one import in `app-web`. Game logic stays untouched (`GOAL.md §3.6`).
5. `pnpm verify` (incl. `deps:check`, which will catch a stray pixi import elsewhere).

**Files touched:** `render-pixi/src/*` only (or a new `render-*` package + one line in `app-web`).

---

## Recipe 4 — Debugging / reproducing a bug

The whole engine is built so you can reproduce any bug **without a human** (`ARCHITECTURE.md §6`).

**Steps:**
1. **Get the event log + seed** from the failing session (saved by `persistence`). A bug report should be a log file, not a paragraph.
2. **Replay it:** `replay(log, seed)` reconstructs the exact world state at each tick. Bisect to the first tick where state diverges from expectation.
3. **Localize:** the diverging event tells you which system emitted it. Open that one `systems/*.ts`.
4. **Write the failing test first** in that system's `*.test.ts`, reproducing the minimal state that triggers the bug. This becomes a permanent regression guard.
5. **Fix, then** `pnpm verify`. Confirm the replay invariant (T-04) still holds.

**Key levers:** `replay(log, seed)`, `hash(world)` for diffing, per-system tests. You should rarely need to read more than the one offending system + its test. If replay refuses because the log's `contentFingerprint` doesn't match current content, that itself is the answer: the bug is content-version drift (`WORLD_STATE.md §7`).

---

## Recipe 5 — Evolving the schema (adding a verb, deprecating a field)

The world grows for years; the schema changes. Keep it bounded so old content and saves don't break.

**Steps:**
1. **New verb (objective/effect/condition):** add the variant in `content-schema/src/` **and** handle it in the engine in the same ticket (Recipe 1). Never ship a schema verb the engine can't apply.
2. **Deprecate, don't delete:** mark the old field deprecated in Zod (`.describe("DEPRECATED: use X")`), keep it working for one major version, then remove.
3. **Bump the version** of whatever format changed — `ContentPack`, `World`, or `ReplayLog` (`WORLD_STATE.md §7`).
4. **Write a migration** in `tools/migrate/` that transforms prior-version data to the new version, plus a **migration test** from the previous version's fixture.
5. **Acceptance criteria for any schema-change ticket must include "migration path for existing packs/saves."**
6. `pnpm verify`.

**Files touched:** the schema file, the engine `apply`/system files, a migration script + test, possibly a content pack. Predictable and bounded — concept-localized even though it spans files.

---

## A note on staying in budget

The budget is about **reading**, not editing. If understanding a task seems to require reading much more than ~3 files, that's a smell the architecture is being violated — flag it rather than reading the whole repo. Editing a predictable handful of files for a cross-cutting change is normal and healthy. The `GOAL.md §5` invariants exist so your *reasoning* stays small and simple; protecting them is part of the job.
