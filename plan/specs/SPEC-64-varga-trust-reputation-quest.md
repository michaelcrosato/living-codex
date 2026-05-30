# SPEC-64 — Reputation-gated Varga follow-up quest ("Proven")

**Wave:** Cycle-7 / C7-P2 (net-new content breadth — the loyalty thread as actual gameplay). **Risk:** LOW
(new hand-authored pack, additive; wires live; uses existing verbs/NPC/locations; no engine/schema change).
Reversible.

## Description + Impact
The player's choices now move faction reputation (the warehouse rewards +10 `varga_crew`; the syndicate
leverage branch +8; refusing Kestrel +10), but **no quest gates on `reputation_at_least`** — only the
`drip_syndicate_eyes` storylet uses it. So the loyalty thread accumulates standing that nothing pays off as
*gameplay*. This adds `quest.varga_trust` ("Proven"), offered by Varga **only at high `varga_crew` standing**
(`reputation_at_least(faction.varga_crew, 15)`) — a sensitive follow-up job that rewards proven loyalty. It's
the first quest to use the reputation gate (exercising an under-used condition through real play) and gives
the loyalty arc a concrete payoff beyond reputation numbers + reactive lines.

Scoped tight: a new pack `pack.varga_trust` (dependsOn opening), reusing `npc.varga` (giver), existing
locations, and Varga's existing dialogue for the `talk_to` signal — **no new NPC/location/dialogue** (the
warehouse-quest convention; the summary + branch labels carry the narrative). Wired live (drip_market /
syndicate_offer precedent).

## Files (in scope)
- `content/core/pack.varga_trust/pack.json` (new — one quest).
- `packages/app-web/src/main.ts` (one import + one `loadPacks` entry).
- `packages/app-web/test/varga-trust.spec.ts` (new — offer-gating + branch-completion).

## Out of scope
- A new Varga "briefing" dialogue/reactsTo (consistent with the warehouse quest, `talk_to` uses her existing
  dialogue; a richer briefing is a future enrichment, not this spec — GOAL §3).
- Any engine/schema change; new verbs; editing the generated pack.

## Design
`quest.varga_trust` ("Proven"), giver `npc.varga`, `offerWhen: [reputation_at_least(faction.varga_crew, 15)]`:
- branch `run_it`: `talk_to npc.varga` → `reach location.the_drip` → `skill_check sneak dc 12` (onFail show_text)
  → onComplete `set_flag varga_inner_circle`, `adjust_reputation varga_crew +5`.
- branch `play_safe`: `talk_to npc.varga` → `skill_check persuade dc 10` (onFail show_text) → onComplete
  `set_flag varga_played_safe`.
- `onAnyComplete`: `set_flag varga_trust_resolved`. `rewards`: credits 150.

## DoD + Acceptance
- [ ] `content:validate`/`content:verify` OK — solvable, reachable, canon-consistent, no hygiene warnings.
- [ ] `varga-trust.spec.ts`: the quest does NOT offer at `varga_crew` rep < 15 and DOES at ≥ 15 (engine
      `ActivateQuest` path); a branch completes end-to-end with its `onComplete` + `onAnyComplete` consequences.
- [ ] `pnpm verify` green; `pnpm --filter @codex/app-web build` green; `pnpm e2e` 4 passed; test count rises.
- [ ] Pipeline golden-master untouched; `pnpm audit` clean.

## Test strategy
Model on `syndicate-offer.spec.ts`: load `[varga_trust, opening]`, set `varga_crew` reputation via
`AdjustReputation` events, assert the `ActivateQuest` offer path is gated on rep ≥ 15, then drive a branch to
completion through `questSystem` (skills set to pass) and assert the flag + reputation consequences. Plus a
live-set load check in `live-packs.spec.ts` is updated to include the new pack.
