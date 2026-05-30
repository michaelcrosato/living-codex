# SPEC-89 — README: in-game controls + accessibility note (onboarding)

**Wave:** Cycle-9 / C9-P0 (docs/onboarding). **Risk:** NONE (README only). Reversible.

## Description + Impact
The README quick-start listed `pnpm` commands but not the in-game CONTROLS — a human running `pnpm dev`
couldn't tell how to play (only the in-app cold-open showed them). Added a "Controls" section (move/talk/
fight/number-keys/Esc + K save / O load / L export / I import, verified against input.ts + main.ts) and a
one-line accessibility note (dyslexia font, screen-reader announcements, keyboard nav, WCAG 2.2 AA).

## DoD + Acceptance
- [x] README documents the actual controls (cross-checked with input.ts/main.ts) + the a11y features.
- [x] README-only (not in the verify path); repo unchanged otherwise.
