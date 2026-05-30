# SPEC-68 — Playability guard: a quest branch with no player-gated objective shadows its siblings

**Wave:** Cycle-7 / C7-P0 (safety/quality tooling — generalize the SPEC-67 finding). **Risk:** LOW (additive,
pure, warning-only). Reversible.

## Description + Impact
SPEC-67 hit a real playability bug: `questSystem` completes **any** active branch whose objectives are all
done, and `talk_to` (on the giver) is satisfied the instant the offer is taken — so a branch whose objectives
are all "ungated" (only `talk_to`/`set_flag`, nothing the player must travel/roll/fight/collect for)
**auto-completes and shadows** its sibling branches, making the intended choices unreachable. I fixed the one
occurrence in-content (removed the branch) and deferred a guard — but the established pattern (SPEC-53
orphan-dialogue, SPEC-60 unspawnable-NPC) is to build the guard on first occurrence, so future hand- and
AI-generated content can't silently reintroduce the class. This adds that guard to `staticPlayabilityCheck`.

**Rule (precise, statically-decidable):** in a **multi-branch** quest, warn on any branch whose objectives are **all `talk_to` the quest GIVER** — taking the offer means talking to the giver, so such a branch is satisfied the instant the quest activates and shadows its siblings. `talk_to` a NON-giver NPC is a legitimate choice mechanic (the player must seek that NPC out) and is NOT flagged. Warning, not error; single-branch quests have no siblings. (Refined during impl from an over-broad "no player-gated objective" heuristic that false-positived on `quest.market_debt`, whose branches talk_to distinct non-giver NPCs — content:verify caught the false positive.)

## Files (in scope)
- `packages/content-loader/src/playability.ts` (add the branch-shadowing scan + warning).
- `packages/content-loader/src/playability.test.ts` (planted shadowing branch → warning; gated branches → none; single-branch → none).
- `plan/BACKLOG.md` (mark the deferred item promoted).

## Out of scope
- Making it an error (single-branch talk_to quests are valid; keep advisory). Detecting subset/weaker-than
  relationships between branches (a deeper analysis; the no-player-gated-objective heuristic catches the real case).
- Any engine/schema change.

## DoD + Acceptance
- [ ] For each quest with **> 1 branch**, any branch whose objectives include none of
      `skill_check`/`reach`/`defeat`/`retrieve` pushes one `warnings` entry naming the quest + branch.
- [ ] No `errors` added; single-branch quests never warn.
- [ ] `playability.test.ts`: a multi-branch quest with an all-`talk_to` branch → its shadowing warning, errors
      empty; a multi-branch quest where every branch has a `skill_check`/`reach` → no shadowing warning; a
      single-branch all-`talk_to` quest → no warning. Existing tests green.
- [ ] `pnpm content:verify` stays 0-error and **0 shadowing warnings** on the real 8 packs (SPEC-67 removed the
      one offender; all remaining multi-branch quests gate every branch).
- [ ] `pnpm verify` green; test count rises. Golden untouched; audit clean.

## Test strategy
Extend `playability.test.ts` with the established `pack({quests:[...]})` builder: a 2-branch quest with one
`[talk_to]`-only branch (expect the warning + empty errors); a 2-branch quest with `skill_check`/`reach` in
each (no warning); a 1-branch `[talk_to]` quest (no warning). The real `content:verify` over all 8 packs is
the integration check (0 shadowing warnings post-SPEC-67).
