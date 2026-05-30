# SPEC-92 — Convergence beat: fully crossed over to the Syndicate

**Wave:** Cycle-9 / C9-P2 (narrative depth — choices compounding). **Risk:** LOW (one storylet). Reversible.

## Description + Impact
The slice's threads were mostly parallel; this adds a CONVERGENCE beat (a combination gate, not a single
flag): the player who BOTH sold the drive (flag.sold_drive) AND joined the Syndicate (flag.syndicate_made_member)
gets storylet.fully_syndicate — "fully crossed over," choices compounding into an emergent state Varga can
never forgive. Salience 8, faction-tagged, fire-once.

## DoD + Acceptance
- [x] storylet.fully_syndicate gated on `all:[sold_drive, syndicate_made_member]` (satisfiable — SPEC-25/70
  clean). syndicate-offer.spec +2 (fires once with both flags; not with one). pnpm verify green (314); build +
  e2e 4 passed; golden untouched; audit clean.
