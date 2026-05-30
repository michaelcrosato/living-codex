# SPEC-84 — WCAG 2.2 AA contrast fix for hint/prompt text

**Wave:** Cycle-9 / C9-P0 (accessibility compliance — research-surfaced). **Risk:** LOW (CSS-only color
change). Reversible.

## Description + Impact
A 2026 a11y research pass (EAA enforced, ADA April-2026 deadlines, WCAG 3.0 on the horizon) flagged text
contrast as a hard requirement. Audit found the hint/prompt/controls text used `#4a5a6a` on `#05070c` ≈
**2.9:1 — below WCAG 2.2 AA's 4.5:1** (essential text: the controls hint "WASD… K save · O load", the
"press any key" prompt, the dialogue "number keys…" hint). Raised to `#8a97a8` ≈ **7:1** (computed), keeping
the muted look while meeting AA. Complements the existing a11y (SPEC-09 modal/focus/reduced-motion/dyslexia,
SPEC-81–83 announcer).

## Files
- `packages/app-web/index.html` (3 `#4a5a6a` → `#8a97a8`).

## DoD + Acceptance
- [x] The 3 hint/prompt usages meet ≥4.5:1 (computed ~7:1 on the #05070c bg). Body/dialogue body text were
  already high-contrast (#cfe6f5/#e6f3ff ≈ >12:1) — only the dim hints failed.
- [x] CSS-only (not unit-testable here; verified by the contrast computation + e2e render). `pnpm verify`
  green (304); build + e2e 4 passed; golden untouched; audit clean.
