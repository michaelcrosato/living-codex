# SPEC-114 — Extend axe WCAG scanning to the open dialogue modal

**Wave:** Cycle-11 P0 (a11y regression net) · **Risk:** LOW · **Status:** Done

## Description + Impact
SPEC-112 added an axe scan of the main game view; its DoD flagged a second scan with a dialogue open.
The dialogue modal is the richest interactive a11y surface (SPEC-09 hardened its ARIA modal contract,
focus-trap, live region) — but the boot-view scan never opens it, so a WCAG regression in the modal
(contrast/labels) would ship unseen by axe. This extends automated coverage to the modal.

## Approach
- New `e2e/nav.ts`: shared `boot()` + `walkToNearestNpcAndTalk()` helpers (deterministic, input-driven —
  the opened modal is the genuine rendered state). Leaves the existing `a11y-dialogue.spec.ts` untouched
  (no risk to a passing test).
- `e2e/axe.spec.ts`: refactor to use `boot()`; add a second test that walks to an NPC, opens the
  dialogue, asserts a choice button is focused, then runs the axe WCAG 2.1 A/AA scan — zero
  serious/critical violations.

## DoD + acceptance
- [x] `pnpm e2e` includes a dialogue-modal axe scan; **6 passed**, both axe scans clean.
- [x] `pnpm verify` EXIT 0 (e2e files typecheck); golden untouched.

## Test strategy
The scan IS the test; reuses the proven navigation from a11y-dialogue.spec via the shared helper.
