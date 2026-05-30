# SPEC-91 — Extend the consequence journal to all threads

**Wave:** Cycle-9 / C9-P1 (consistency — HUD/a11y journal). **Risk:** LOW (3 CONSEQUENCE_LINES entries).
Reversible.

## Description + Impact
The shared CONSEQUENCE_LINES journal (HUD + a11y announcer, SPEC-83) reflected the drive arc but not the
other threads' headline outcomes. Added `learned_origin` (amnesia), `clinic_debt_resolved` (clinic),
`told_the_kid` (the human beat) so the "world remembers" journal — shown in the HUD and spoken by the
announcer — covers the whole slice, not just the Syndicate-drive thread.

## DoD + Acceptance
- [x] 3 entries added; hud.spec +1 (each new line renders). pnpm verify green (312); build + e2e 4 passed;
  golden untouched; audit clean.
