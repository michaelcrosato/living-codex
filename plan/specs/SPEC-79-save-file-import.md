# SPEC-79 — Import a save file (export/import symmetry)

**Wave:** Cycle-8 / C8-P1 (complete the share/restore loop). **Risk:** LOW (thin DOM glue; restore path already
tested). Reversible.

## Description + Impact
SPEC-78 completed the primary save/load loop (K save → O load via IndexedDB). The export path (L → downloads a
save JSON, the "deterministic bug report / share" feature) had no counterpart — `importSave` exists + is
tested but was unwired, so a shared/exported save file could never be loaded back. This wires file import: a
hidden file input triggered by the 'i' key parses the picked JSON via `importSave` and restores via
`GameSession.restore` (the same path the O-load uses).

## Files
- `packages/app-web/src/main.ts` (hidden file input + 'i' key + shared `restoreFrom` helper; O-load refactored to it).

## Out of scope / notes
- No new unit test: `importSave` (persistence round-trip) + `GameSession.restore` (session.spec, SPEC-78) are
  already tested; the only new code is the file-read DOM glue (not e2e-tested — honest). verify+build+e2e
  confirm it compiles + the app still boots.

## DoD + Acceptance
- [x] 'i' opens a file picker; a valid exported JSON → `importSave` → `GameSession.restore` → session swapped
  (toast "Imported."); a bad file → caught, toast. `restoreFrom` shared by O-load + import.
- [x] `pnpm verify` green (299); build + e2e 4 passed; golden untouched; audit clean.
