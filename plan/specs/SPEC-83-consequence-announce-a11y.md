# SPEC-83 — Announce consequence changes (a11y) + DRY the HUD consequence list

**Wave:** Cycle-8 / C8-P1 (accessibility completion + code quality). **Risk:** LOW (pure helper + a
behavior-preserving HUD refactor). Reversible.

## Description + Impact
Completes the SPEC-81/82 a11y announcer: newly-set "world remembers" consequence flags (sold the drive,
learned your origin, etc.) were silent for screen-reader users though the HUD shows them. Refactored the
HUD's inline flag→line block into one shared `CONSEQUENCE_LINES` data list (flag → icon + spoken text), used
by BOTH `renderHud` (icon + text) and a new `consequenceAnnouncements(prevSeen, world)` helper (spoken text,
deduped). The a11y announcer now covers navigation (location) + progress (quests) + consequences.

## DoD + Acceptance
- [x] `CONSEQUENCE_LINES` shared by renderHud + the announcer (behavior-preserving — existing HUD tests pass).
- [x] `consequenceAnnouncements` emits each newly-true consequence once (deduped via the returned seen-set);
  main.ts feeds it to #announcer. hud.spec +1. `pnpm verify` green (304); build + e2e 4 passed; golden
  untouched; audit clean.
