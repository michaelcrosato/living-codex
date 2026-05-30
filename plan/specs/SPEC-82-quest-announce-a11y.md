# SPEC-82 — Screen-reader announcements for quest-status changes (a11y)

**Wave:** Cycle-8 / C8-P1 (accessibility — complete the SPEC-81 announcer). **Risk:** LOW (pure helper +
existing live region). Reversible.

## Description + Impact
SPEC-81 announced location changes; quest progress (start/complete) was still silent for screen-reader users
though the HUD shows it visually. `questAnnouncements(prev, world, registries)` returns one line per quest
whose status changed ("Quest started/completed: …") + the new status map, deduped so each transition is
spoken once. main.ts combines location + quest announcements into the polite #announcer per frame.

## DoD + Acceptance
- [x] `questAnnouncements` emits "Quest started/completed: <title>." on a status change, [] when unchanged
  (deduped via the returned status map). main.ts feeds location + quest lines to #announcer.
- [x] hud.spec +1. `pnpm verify` green (303); build + e2e 4 passed; golden untouched; audit clean.
