> Part of the Living Codex build package. See `AGENTS.md` and `docs/AGENT_GUIDES.md` (index).

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
