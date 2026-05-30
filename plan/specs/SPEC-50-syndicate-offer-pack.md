# SPEC-50 — Content pack: "The City's Cut" (the Syndicate's offer)

**Wave:** Cycle-7 / C7-P0 (unblocked product depth — the real-model frontier is human-gated; content is
the thesis's core lever and needs no API key). **Recipe:** new curated pack (SPEC-13 / SPEC-33 precedent).
**Risk:** LOW (additive; new files + one `main.ts` import line + one test). Reversible.

## Description + Impact
The vertical-slice canon has a dangling thread. The player lifts `item.encrypted_drive` from the Ashfall
warehouse (`quest.the_warehouse` → `flag.has_drive`), and the **Ashfall Syndicate** is established as the
power that "runs the city" (`faction.ashfall_syndicate`, ethos *"The city runs on what we let it keep."*) —
yet the Syndicate has **no NPC face** and **nothing in the world reacts to the player holding the drive**.

This pack closes that loop: a Syndicate broker makes contact at `the_drip` once the player has the drive and
offers three framings of the same dilemma — **sell** the data back, **decrypt** it to see what the Syndicate
is hiding, or **keep it as leverage**. Each framing has a distinct skill check and distinct faction
consequence (selling burns Varga; leverage earns her respect; decrypting keeps the secret). It gives the
Syndicate a presence, makes the drive *matter*, and adds a sequential beat after the warehouse — real player
value, authored entirely with existing verbs/conditions (no engine change).

**Impact:** +1 faction face for the Syndicate, +1 NPC, +1 Ink dialogue, +1 three-branch quest, +1 storylet,
+canon assertions. Exercises `flag_is` offer-gating, `talk_to` + `skill_check(persuade/tech/force)`,
`set_flag`/`adjust_reputation`/`give_item` effects, the storylet salience layer (faction-tagged → SPEC-32
waypoint-eligible), and the canon-assertion graph (`member_of`/`located_in`/`status`/`fact`) — all through
the identical load+play path as hand-authored and generated content.

## Files (in scope)
- `content/core/pack.syndicate_offer/pack.json` (new)
- `content/core/pack.syndicate_offer/ink/syndicate_broker.ink` (new; compiled via `content:compile-ink`)
- `packages/app-web/src/main.ts` (one import + one `loadPacks([...])` array entry — wire live, drip_market precedent)
- `packages/app-web/test/syndicate-offer.spec.ts` (new; same-path load + end-to-end branch play, rival-fixer precedent)

## Out of scope
- Any engine-core / schema / loader change (uses existing verbs only — GOAL §3: no speculative verbs).
- New geography (the broker lives in the existing reachable `location.the_drip`).
- Removing the drive from inventory on "sell" (no `remove_item` verb exists; the deal is recorded as a
  **flag**, matching how all existing content carries narrative state — do NOT imply a mechanic that isn't there).

## Canon design (references existing IDs only)
- **NPC** `npc.syndicate_broker` ("Mireille Tan"), `faction.ashfall_syndicate`, `homeLocationId: location.the_drip`, `dialogueId: dialogue.syndicate_broker`.
- **Quest** `quest.syndicate_offer` ("The City's Cut"), `giverNpcId: npc.syndicate_broker`,
  `offerWhen: [{flag_is flag.has_drive == true}]` (chains off `quest.the_warehouse`).
  - branch `sell`: talk_to broker → skill_check `persuade` dc 12 (onFail show_text) → onComplete set `flag.sold_drive`, rep `ashfall_syndicate` +12, rep `varga_crew` −8.
  - branch `decrypt`: talk_to broker → skill_check `tech` dc 14 (onFail show_text) → onComplete set `flag.cracked_drive` + `flag.knows_syndicate_secret`.
  - branch `leverage`: talk_to broker → skill_check `force` dc 10 (onFail show_text) → onComplete set `flag.leveraged_syndicate`, rep `varga_crew` +8, rep `ashfall_syndicate` −10.
  - `onAnyComplete`: set `flag.syndicate_resolved` = true. `rewards`: credits 120.
- **Storylet** `storylet.broker_watching` — ambient, `preconditions: [flag.has_drive == true, not(flag.syndicate_resolved == true)]`, `salience` 6, `tags: ["ashfall_syndicate"]` (faction-tagged → SPEC-32 eligible), `content.ambient`, no effects (pure bark).
- **Assertions** (consistent with the world): `member_of` broker→syndicate; `located_in` broker→the_drip; `status` broker `alive`; `fact` broker note.

## DoD + Acceptance
- [ ] `pnpm content:validate` OK and reports **7 packs / 18 npcs / 5 quests / 7 locations** (no integrity error).
- [ ] `pnpm content:verify` OK — quest solvable + reachable, storylet satisfiable, **canon assertion graph consistent** (no contradiction).
- [ ] `content:compile-ink content/core/pack.syndicate_offer` injects `compiled` + `sourceHash`; `dialogue.syndicate_broker` plays (3 choices; sets `met_broker`).
- [ ] New `syndicate-offer.spec.ts` proves: (a) loads in ONE registry alongside opening + a generated pack; (b) cross-pack refs resolve (broker.faction = ashfall_syndicate from opening; home = the_drip from opening); (c) the Ink plays; (d) the quest **does NOT offer** without `flag.has_drive` and **does** with it; (e) a branch completes end-to-end through the real engine and applies its consequences (flag + reputation).
- [ ] `pnpm verify` green (typecheck/lint/deps/test/content/replay); test count rises.
- [ ] App still builds (`pnpm --filter @codex/app-web build`) with the new pack wired live.
- [ ] Golden-master (`cycle.test.ts`) **untouched** (no pipeline change). `pnpm audit` stays clean.

## Test strategy
Model on `packages/app-web/test/rival-fixer.spec.ts`: load `[syndicateOffer, patrons, opening]` through the
real `loadPacks`; assert registry membership + cross-pack ref resolution; drive the broker's Ink through
`InkNarrative`; then build a `World`, assert `questOffers` excludes the quest without `flag.has_drive` and
includes it with the flag set, set the `talk_to` signal via `DialogueAdvanced`, run `questSystem` with an
`Attempt` on a branch (skills set high enough to pass the check), and assert the branch completes with its
`onComplete` + `onAnyComplete` consequences (flag + reputation delta). All deterministic, hermetic, offline.
