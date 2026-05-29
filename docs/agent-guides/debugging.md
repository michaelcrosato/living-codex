> Part of the Living Codex build package. See `AGENTS.md` and `docs/AGENT_GUIDES.md` (index).

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
