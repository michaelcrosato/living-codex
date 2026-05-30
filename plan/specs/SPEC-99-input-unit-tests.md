# SPEC-99 — Unit-test InputController key mapping

**Wave:** Cycle-9 / C9-P1 (coverage — the input layer). **Risk:** LOW (test-only). Reversible.

## Description + Impact
InputController (keyboard → InputEvent) was only e2e-smoke-tested (Space + 'd'); its mapping logic was
unit-untested — including the conditional number-key behavior (dialogue choice when a dialogue is open, exit
selector otherwise), the branch most likely to regress. Added input.spec.ts via a fake event target:
E→Interact, F→Attack (discrete, queue clears on drain); held WASD/arrows → one Move/frame (diagonals;
release stops); number keys → UseExit with no dialogue, Choose when open (reverts to exit after close);
choose() no-op with no dialogue.

## DoD + Acceptance
- [x] input.spec +5 covering the mapping + the exit/choice conditional. pnpm verify green (326); golden
  untouched; audit clean.
