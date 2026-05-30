# SPEC-58 — Complete Kestrel's reaction set: the `played_both` outcome

**Wave:** Cycle-7 / C7-P1 (completeness — remove an asymmetry). **Risk:** LOW (additive; one dialogue + one
reaction + one test). Reversible.

## Description + Impact
SPEC-55 added Kestrel reactions for two of the rival quest's three outcomes (`sided_with_kestrel`,
`refused_kestrel`) but deliberately deferred `played_both`. With two of three wired, the gap is now an
**asymmetry** — the system visibly "remembers" two choices and forgets the third (the clever
play-both-sides path), which a reviewer would flag. This completes the set: a distinct follow-up where
Kestrel acknowledges she's been played and is "counting now — same as Varga." It's genuinely distinct content
(the manipulator's grudging respect), not a clone of the warm/cold lines.

**Impact:** all three rival-quest outcomes now have an in-character Kestrel follow-up; the "world remembers"
pillar covers the rival thread completely.

## Files (in scope)
- `content/core/pack.kestrel/pack.json` (one new `DialogueAsset` + one `reactsTo` entry on npc.kestrel).
- `content/core/pack.kestrel/ink/kestrel_played.ink` (new; compiled).
- `packages/app-web/test/rival-fixer.spec.ts` (add the played_both case to the SPEC-55 reactions block).

## Out of scope
- A reaction to the `kestrel_wary` failure flag (the persuade-fail sub-state) — the branch *outcome* flags are
  the meaningful unit; the fail sub-state is a future hook if content demands it.
- Any engine/schema change.

## DoD + Acceptance
- [ ] `npc.kestrel.reactsTo` gains `when [flag_is flag.played_both == true] → dialogue.kestrel_played`
      (mutually exclusive with sided/refused — no ordering ambiguity).
- [ ] `dialogue.kestrel_played` authored + compiled; existing kestrel blobs byte-unchanged (verified).
- [ ] `content:verify` OK (no orphan: the dialogue is referenced by the reaction).
- [ ] `rival-fixer.spec.ts`: after `flag.played_both`, Kestrel's active dialogue is `dialogue.kestrel_played`;
      existing sided/refused/neither cases stay green.
- [ ] `pnpm verify` green; production build green; `pnpm e2e` 4 passed; golden untouched; audit clean.

## Test strategy
Add one case to the existing SPEC-55 reactions block (`afterFlag("flag.played_both")` → `dialogue.kestrel_played`).
