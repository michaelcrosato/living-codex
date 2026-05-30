# SPEC-81 — Screen-reader announcements for location changes (HUD a11y)

**Wave:** Cycle-8 / C8-P1 (accessibility — extend SPEC-09 to game navigation). **Risk:** LOW (pure helper +
a polite live region; no engine impact). Reversible.

## Description + Impact
SPEC-09 made the dialogue modal accessible, but the #hud (location/skills/quests/consequences) had no aria
attributes — a screen-reader user got no announcement of game state, and the HUD re-renders every frame so it
can't itself be a live region (it would spam). This adds a polite, visually-hidden announcer that speaks
discrete LOCATION CHANGES ("Entered The Drip.") — the key navigational info — deduped (only on change). A pure
`locationAnnouncement(prev, world, registries)` helper makes it unit-testable; the shell tracks the last
announced location and feeds the live region.

## Files
- `packages/app-web/src/hud.ts` (`locationAnnouncement` helper). `index.html` (`.sr-only` + `#announcer`
  aria-live=polite). `main.ts` (track + feed). `packages/app-web/test/hud.spec.ts` (+1).

## Out of scope / next
- Announcing quest-status / consequence changes too (extend the same deduped-announcer pattern) → BACKLOG.

## DoD + Acceptance
- [x] `locationAnnouncement` returns "Entered <name>." on change, null when unchanged. main.ts feeds a polite
  sr-only #announcer only on change. hud.spec +1. `pnpm verify` green (302); build + e2e 4 passed; golden
  untouched; audit clean.
