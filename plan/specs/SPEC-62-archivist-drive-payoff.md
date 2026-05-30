# SPEC-62 — Integrate the Archivist into the drive thread (pay off a designed hook)

**Wave:** Cycle-7 / C7-P1 (content integration — connect freshly-reachable content to the main thread).
**Risk:** LOW (additive storylet in a hand-authored pack; no engine/schema change; no edit to the generated
pack — preserves its provenance). Reversible.

## Description + Impact
SPEC-59 made the 10 generated Drip patrons reachable. One — `npc.the_archivist`, "keeper of dangerous
truths," whose bio explicitly *wants "the drive, and the one who took it"* — is a **designed hook** that pays
off nowhere: a player can now meet her, but nothing connects her to the warehouse-drive thread she was
written for. This adds a fire-once salience storylet that fires once the player both **holds the drive**
(`flag.has_drive`) and **has met the Archivist** (`flag.met_archivist`, mirrored from her Ink's declared var)
— the bar's lore-keeper visibly clocking what the player is carrying. It integrates a freshly-reachable NPC
into the main thread by paying off her authored intent, with no new verb and no edit to the generated pack
(the storylet lives in the hand-authored `pack.syndicate_offer`, referencing only runtime flags).

**Impact:** the Archivist is no longer disconnected flavor — her designed "wants the drive" hook now lands in
play; the drive thread gains a second voice (after the Syndicate broker).

## Files (in scope)
- `content/core/pack.syndicate_offer/pack.json` (add one `Storylet`).
- `packages/app-web/test/syndicate-offer.spec.ts` (add a GameSession firing test).

## Out of scope
- Editing `pack.the_drip_patrons` (preserve its `provenance: pipeline` — the integration is a hand-authored
  storylet keyed on the flag her dialogue already sets, not a change to the generated NPC).
- A full Archivist quest / new verb (GOAL §3 — a storylet beat is the right-sized payoff for a flavor-NPC hook).

## Design
`storylet.archivist_knows` in `pack.syndicate_offer`:
- `preconditions: [flag_is has_drive == true, flag_is met_archivist == true, not(flag_is bark_archivist_seen == true)]`
- `salience: 7`, `tags: []` (the Archivist is unaffiliated — no faction-alignment bonus).
- `content.ambient`: the Archivist clocking the drive the player carries.
- `effects: [set_flag bark_archivist_seen → true]` (fire-once).

## DoD + Acceptance
- [ ] `content:validate`/`content:verify` OK — the storylet is satisfiable, canon-consistent, no
      orphan/unspawnable/contradiction warnings.
- [ ] `syndicate-offer.spec.ts` (GameSession, storylet-barks pattern): with `has_drive` + `met_archivist`
      seeded, `storylet.archivist_knows` is an eligible TriggerStorylet candidate; fires once; session replays
      to an identical hash.
- [ ] `pnpm verify` green; test count rises. Pipeline golden-master untouched; `pnpm audit` clean.

## Test strategy
Mirror the SPEC-54 `knows_secret` firing test: a `GameSession` over `[opening, syndicate_offer]` with
`seedEvents: [SetFlag has_drive, SetFlag met_archivist]`, step → assert the storylet candidate present, step
→ assert gone (fire-once), and `hash(replay) === hash(live)`.
