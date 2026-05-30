# SPEC-85 — Don't convey alive/downed by color alone (WCAG 1.4.1)

**Wave:** Cycle-9 / C9-P0 (accessibility — use of color). **Risk:** LOW (one radius expression in scene.ts).
Reversible.

## Description + Impact
WCAG 1.4.1 ("Use of Color") requires that information not be conveyed by color alone. In the scene, alive vs
downed NPCs differed ONLY by color (bodyColor/cyan vs grey #555) — a colorblind/low-vision player couldn't
tell a defeated NPC. Added a non-color cue: downed entities are drawn distinctly smaller (radius 4 vs 7 for a
living NPC, 8 for the player). Pure derived-view; no engine impact.

## DoD + Acceptance
- [x] `drawScene` radius = player 8 / alive NPC 7 / downed 4 (size cue independent of the grey fill).
- [x] `scene.spec` downed case asserts `circle:4` (and not `circle:7`). `pnpm verify` green (304); build +
  e2e 4 passed; golden untouched; audit clean.
