# SPEC-74 — Render authored NPC appearance (bodyColor + accentColor)

**Wave:** Cycle-8 / C8-P1 (UX — display authored-but-unrendered content). **Risk:** LOW (scene draw style;
pure read; no engine/schema/content change). Reversible.

## Description + Impact
A render-layer audit found `scene.ts` drew every NPC as a generic cyan circle (`#2bd1ff`) — the authored
`appearance` (bodyColor/accentColor/silhouette) on all 19 NPCs was never rendered (the ambientText class).
Now a living NPC is filled with its `bodyColor` and ringed with its `accentColor`, giving each its authored
visual identity. Player stays gold; downed NPCs stay grey. Pure derived-view (looks up the NPC by
`entity.defId` in registries); no World/replay/engine impact.

## Out of scope
- `silhouette` shape variation (the renderer draws circles; per-silhouette shapes need new primitives) → BACKLOG.

## DoD + Acceptance
- [x] `drawScene` fills a living NPC with `appearance.bodyColor` (fallback cyan if no NPC) + strokes
  `accentColor`; player gold; downed grey.
- [x] `scene.spec` (FakeRenderer now captures fills/strokes): a co-located NPC → its bodyColor fill +
  accentColor stroke; a downed NPC → grey. `pnpm verify` green (294); build + e2e 4 passed; golden untouched.
