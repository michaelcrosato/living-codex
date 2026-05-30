# SPEC-66 — Syndicate recruitment quest (the standing-payoff pair to SPEC-64)

**Wave:** Cycle-7 / C7-P2 (net-new content — complete the faction-standing payoff pair). **Risk:** LOW
(additive quest in the already-live `pack.syndicate_offer`; reuses the broker NPC; no engine/schema/main.ts
change). Reversible.

## Description + Impact
SPEC-64 gave Varga's crew a reputation-gated loyalty payoff (`quest.varga_trust`, gated on `varga_crew ≥ 15`).
The Ashfall Syndicate — the other major faction — has **no standing-payoff**: a player who proves useful to
them (the `sell` branch of `quest.syndicate_offer` grants `+12 ashfall_syndicate`) accrues Syndicate standing
that nothing pays off. This adds `quest.syndicate_recruit` ("The City's Offer"), offered by the broker only at
`reputation_at_least(faction.ashfall_syndicate, 12)` — formal recruitment for those who've earned the
Syndicate's trust (i.e., sold them the drive). It mirrors SPEC-64, **completing the faction-standing payoff
pair** for the two major factions; further parallel rep-quests beyond this pair would be churn (per the
SPEC-64 JOURNAL note).

Lives in the already-live `pack.syndicate_offer` (where `npc.syndicate_broker` is defined) — so no new pack
and no `main.ts`/`live-packs` change. Reuses the broker + her dialogue (`talk_to` signal) + existing
locations. No new verb (GOAL §3).

## Files (in scope)
- `content/core/pack.syndicate_offer/pack.json` (add one quest).
- `packages/app-web/test/syndicate-offer.spec.ts` (add offer-gating + branch-completion test).

## Out of scope
- A third parallel rep-quest for `faction.kestrel_outfit` (the varga/syndicate pair is the complete set;
  Kestrel's standing already pays off via her reactions SPEC-55/58). New NPC/dialogue/verb. main.ts changes.

## Design
`quest.syndicate_recruit` ("The City's Offer"), giver `npc.syndicate_broker`,
`offerWhen: [reputation_at_least(faction.ashfall_syndicate, 12)]`:
- branch `join`: `talk_to npc.syndicate_broker` → `skill_check persuade dc 12` (onFail show_text) → onComplete
  `set_flag syndicate_made_member`, `adjust_reputation ashfall_syndicate +5`, `adjust_reputation varga_crew −5`.
- branch `stay_independent`: `talk_to npc.syndicate_broker` → `skill_check force dc 10` (onFail show_text) →
  onComplete `set_flag syndicate_stayed_independent`.
- `onAnyComplete`: `set_flag syndicate_recruit_resolved`. `rewards`: credits 150.

## DoD + Acceptance
- [ ] `content:validate`/`content:verify` OK — solvable, reachable, canon-consistent, no hygiene warnings.
- [ ] `syndicate-offer.spec.ts`: the quest does NOT offer at `ashfall_syndicate` rep < 12 and DOES at ≥ 12
      (engine `ActivateQuest` path); a branch completes end-to-end with its flag + reputation consequences.
- [ ] `pnpm verify` green; `pnpm --filter @codex/app-web build` green; `pnpm e2e` 4 passed; test count rises.
- [ ] Pipeline golden-master untouched; `pnpm audit` clean.

## Test strategy
Mirror the SPEC-64 `varga-trust` test: load `[syndicate, opening]`, set `ashfall_syndicate` rep via
`AdjustReputation`, assert the `ActivateQuest` offer path is gated on rep ≥ 12, then drive `join` to completion
through `questSystem` (skills set to pass) and assert the flag + reputation consequences (incl. the −5
`varga_crew` cost of formally joining the Syndicate).
