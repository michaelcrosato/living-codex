# SPEC-86 — The Syndicate cleaner: leverage-choice payoff (combat beat)

**Wave:** Cycle-9 / C9-P2 (content depth — pay off the leverage choice + exercise combat). **Risk:** LOW
(additive NPC/dialogue/quest in the live pack.syndicate_offer; uses existing verbs). Reversible.

## Description + Impact
The SPEC-50 "leverage" branch (`flag.leveraged_syndicate`) paid off only via reputation — no confrontation,
unlike "sell" (Varga reaction) and "decrypt" (storylet). This adds a genuine consequence: the Syndicate sends
a **cleaner** (`npc.syndicate_cleaner`, combat-capable, hp 14) after anyone holding the drive over them.
`quest.loose_ends` (offerWhen `flag.leveraged_syndicate`) — fight (defeat) / talk_down (persuade) / slip_away
(sneak). It's the second `defeat` objective in shipped content (after the warehouse guard) and the first
combat NPC the Syndicate fields — exercising the combat path through real content (and validated by the
SPEC-72 defeat-requires-combat guard).

## Files
- `content/core/pack.syndicate_offer/pack.json` (NPC + dialogue + quest + assertions) + `ink/syndicate_cleaner.ink`.
- `packages/app-web/test/syndicate-offer.spec.ts` (offer-gating + talk_down completion).

## DoD + Acceptance
- [x] `quest.loose_ends` offers only on `flag.leveraged_syndicate`; 3 player-gated branches (SPEC-68 clean);
  cleaner has combat.hp 14 so `fight`/defeat is solvable (SPEC-72 clean). content:verify 11 quests, 0 warnings.
- [x] Existing broker dialogue blob byte-unchanged on recompile; +2 tests (306). build + e2e 4 passed; golden
  untouched; audit clean.
