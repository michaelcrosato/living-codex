# SPEC-88 — "Someone's Brother": the telling (street-kid follow-up)

**Wave:** Cycle-9 / C9-P2 (complete the SPEC-87 human beat). **Risk:** LOW (one dialogue + one reactsTo).
Reversible.

## Description + Impact
SPEC-87 resolved with a show_text to the PLAYER — but the beat's emotional point was "tell her." This adds
the telling: once you've searched (`flag.searched_for_tomas`), facing the kid gives `dialogue.street_kid_after`
(you hand her the coat; she already knew) and latches `flag.told_the_kid`. Completes the human beat's payoff.

## DoD + Acceptance
- [x] npc.street_kid reactsTo `flag.searched_for_tomas` → `dialogue.street_kid_after` + sets `told_the_kid`;
  existing street_kid blob byte-unchanged. street-kid.spec +1 (dialogue flips post-search, flag latches).
- [x] content:verify 0 warnings; pnpm verify green (309); build + e2e 4 passed; golden untouched; audit clean.
