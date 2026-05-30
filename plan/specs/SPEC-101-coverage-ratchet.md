# SPEC-101 — Ratchet the coverage floor (lock in the Cycle 7–9 gains)

**Wave:** Cycle-9 / C9-P0 (quality-infra — the ratchet SPEC-28 anticipated). **Risk:** LOW (CI gate config;
~3pt anti-flake margin). Reversible.

## Description + Impact
SPEC-28 set the floor ~3pt under the old 75% baseline and explicitly anticipated "a score ratchet once the
baseline stabilizes." The Cycle-7–9 test work (bake, input, camera, integration, pipeline gates, etc.) raised
coverage to **81.83 stmts / 76.63 branch / 81.92 funcs / 83.09 lines** (measured). Ratcheted the floor
72/60/72/72 → **78/73/78/80** (~3pt under, anti-flake margin) so a future regression below the new level fails
`pnpm test:coverage` (CI) — locking in the gains without flaking routine work.

## DoD + Acceptance
- [x] vitest.config.ts thresholds 78/73/78/80; `pnpm test:coverage` EXIT 0 (passes with margin); `pnpm verify`
  EXIT 0 (329, unaffected — runs `pnpm test` not coverage). Golden untouched; audit clean.
