> Part of the Living Codex build package. See `AGENTS.md` and `docs/AGENT_GUIDES.md` (index).

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
