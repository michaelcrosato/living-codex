# SPEC-77 — Clinic training quest: skill progression (exercise modify_skill + has_item)

**Wave:** Cycle-8 / C8-P2 (content depth — exercise implemented-but-unused mechanics). **Risk:** LOW (additive
content in the live pack.clinic; uses existing engine verbs). Reversible.

## Description + Impact
A content/verb-coverage audit found `modify_skill` and `has_item` are implemented + engine-tested but
exercised by NO content — the player's skills never change in play (a real RPG progression gap), and item
gates are never used. This adds a coherent skill-progression beat: after settling the clinic debt
(`flag.clinic_debt_resolved`), Sister Vane offers to teach the player field medicine (+1 `tech`) and hands
over a field kit, exercising `modify_skill` + `give_item` (reward) and `has_item` (a storylet gated on
carrying the kit). Genuine new gameplay (progression + item state), validating the verbs end-to-end in real play.

## Files (in scope)
- `content/core/pack.clinic/pack.json` — new `item.field_kit`, `quest.clinic_training`, `storylet.field_kit_ready`.
- `packages/app-web/test/clinic.spec.ts` (skill-up + item + has_item-storylet test).

## Out of scope
- `start_quest` / `unlock_exit` / `set_npc_dialogue` effects + `retrieve` / `set_flag` objectives + `any`
  condition (other unused verbs) — exercise each when content genuinely demands it (GOAL §3); noted in BACKLOG.

## Design
- `item.field_kit` (kind consumable). `quest.clinic_training` (giver clinic_medic, `offerWhen:[flag_is
  clinic_debt_resolved]`, single branch `train`: talk_to medic + skill_check tech dc 8 → onComplete
  `modify_skill {tech,+1}`, `give_item field_kit`, `set_flag trained_by_vane`; onAnyComplete `set_flag
  clinic_training_resolved`; rewards credits 0). `storylet.field_kit_ready` (precondition `has_item field_kit`
  + not seen, fire-once ambient).

## DoD + Acceptance
- [ ] `content:validate`/`content:verify` OK — solvable, canon-consistent, 0 hygiene warnings (single-branch →
  no SPEC-68 flag; flags wired → no SPEC-70 flag).
- [ ] `clinic.spec`: completing `train` raises `world.player.skills.tech` by 1 and grants `item.field_kit`;
  the `has_item`-gated storylet is eligible once the kit is held.
- [ ] `pnpm verify` green; build + e2e 4 passed; golden untouched; audit clean.

## Test strategy
Extend `clinic.spec.ts`: set `flag.clinic_debt_resolved`, talk_to medic + drive `train` via `questSystem`
(tech high enough), assert `skills.tech` increased + inventory has `item.field_kit`; then a GameSession (or
storylet eligibility) check that `storylet.field_kit_ready` fires when the kit is held.
