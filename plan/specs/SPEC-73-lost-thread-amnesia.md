# SPEC-73 — New thread: "What You Forgot" (the cold-open amnesia payoff)

**Wave:** Cycle-8 / C8-P2 (net-new content — a personal-stakes thread, not faction). **Risk:** LOW-MED
(edits pack.opening's stranger + adds a pack; additive; wired live). Reversible.

## Description + Impact
The cold open establishes amnesia ("you don't remember how you got here") and `npc.stranger` is written as
"the cold-open contact… knows more about your missing memory than they let on" (secret: "Knows how you really
got to Ashfall") — but **no quest references the stranger**; the identity thread is unexplored. Every existing
thread is faction-allegiance or service; this is the player's **personal** stakes, paying off the opening
hook. Once the player has proven they're not the disposable amnesiac the stranger expected (`flag.has_drive`),
the stranger's dialogue opens up and a quest lets the player press for the truth of their past.

## Files (in scope)
- `content/core/pack.opening/pack.json` — `npc.stranger` gains a `reactsTo` (`flag.has_drive → dialogue.stranger_truth`) + the new `dialogue.stranger_truth`. `content/core/pack.opening/ink/stranger_truth.ink` (new).
- `content/core/pack.lost_thread/pack.json` (new) — `quest.lost_thread`.
- `packages/app-web/src/main.ts` (+ `test/live-packs.spec.ts`) — wire live, lockstep.
- `packages/app-web/test/lost-thread.spec.ts` (new).

## Out of scope
- Over-specifying the backstory (keep the revelation evocative — a `show_text` beat + `flag.learned_origin`,
  not a lore dump; GOAL §3). New verbs. Editing generated packs.

## Design
- **pack.opening:** `npc.stranger.reactsTo += { when:[flag_is has_drive], overrideDialogueId: dialogue.stranger_truth }`;
  new `dialogue.stranger_truth` (Ink, sets `stranger_opened`) — the stranger, cornered by the player's success,
  finally edges toward the truth. Recompile opening Ink (existing blobs must stay byte-unchanged).
- **pack.lost_thread (dependsOn opening, wired live):** `quest.lost_thread` ("What You Forgot"), giver
  `npc.stranger`, `offerWhen:[flag_is has_drive]`. Branches (both player-gated, per SPEC-68): `press` (talk_to
  stranger + skill_check force) / `bargain` (talk_to + skill_check persuade). `onAnyComplete`: `set_flag
  learned_origin` + a `show_text` revelation beat. rewards: credits.

## DoD + Acceptance
- [ ] `content:validate`/`content:verify` OK — solvable, reachable, canon-consistent, 0 hygiene warnings
  (incl. the SPEC-68 branch-shadowing + SPEC-70 flag-gate guards). pack.opening still loads in isolation
  (replay-fuzz green); recompiling its Ink leaves existing blobs byte-unchanged.
- [ ] `lost-thread.spec.ts`: same-path load; the stranger's dialogue becomes `dialogue.stranger_truth` after
  `flag.has_drive` (reactionsSystem); the quest offers on `has_drive` (ActivateQuest) and a branch completes
  end-to-end with `learned_origin` + the revelation.
- [ ] `pnpm verify` green; build green; `pnpm e2e` 4 passed; golden untouched; audit clean.

## Test strategy
Model on `clinic.spec.ts` + `reactive-payoff.spec.ts`: load `[lost_thread, opening]`; assert the stranger
reactsTo flips to `dialogue.stranger_truth` post-`has_drive`; offer-gate the quest on `has_drive`; complete
`bargain` through `questSystem` and assert `learned_origin` + `lost_thread_resolved`.
