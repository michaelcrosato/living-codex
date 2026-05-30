# SPEC-69 — The clinic medic reacts to the player's faction standing

**Wave:** Cycle-7 / C7-P1 (cross-thread integration). **Risk:** LOW (additive reactsTo on the new clinic
NPC + 2 dialogues; no engine/schema change). Reversible.

## Description + Impact
SPEC-67's medic ("treats Varga's crew and the Syndicate both, tells neither") was disconnected from the
faction-standing outcomes (SPEC-64 `varga_inner_circle`, SPEC-66 `syndicate_made_member`). This adds two
`reactsTo` entries so the neutral medic acknowledges where the player landed — `dialogue.medic_syndicate`
(joined the Syndicate) / `dialogue.medic_varga` (Varga's inner circle) — paying off her authored "treats both"
character and tying the new clinic thread into the faction system. Triggers are independent quest outcomes; if
both somehow hold, last-appended wins (acceptable). Default offer line otherwise.

## Files
- `content/core/pack.clinic/pack.json` (2 DialogueAssets + 2 reactsTo) + `ink/medic_syndicate.ink`,
  `ink/medic_varga.ink`. `packages/app-web/test/clinic.spec.ts` (reaction test).

## DoD + Acceptance
- [x] reactsTo: `syndicate_made_member → medic_syndicate`, `varga_inner_circle → medic_varga`; existing
  `dialogue.clinic_medic` blob byte-unchanged; both new dialogues referenced (orphan guard silent).
- [x] clinic.spec: each standing → its line; neither → default. `pnpm verify` green (282); build + e2e 4 passed;
  golden untouched; audit clean.
