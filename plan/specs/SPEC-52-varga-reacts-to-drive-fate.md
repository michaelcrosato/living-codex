# SPEC-52 — Varga reacts to the drive's fate (reactive payoff for the Syndicate choice)

**Wave:** Cycle-7 / C7-P1 (narrative depth — make choices consequential). **Risk:** LOW-MED (touches core
`pack.opening` content + reaction ordering; additive reaction appended last; covered by tests). Reversible.

## Description + Impact
SPEC-50 gave the player three ways to dispose of the warehouse drive (sell to the Syndicate / decrypt /
keep as leverage), but the outcomes are **terminal flags with no payoff** — nothing in the world reacts.
Meanwhile `quest.the_warehouse` is *Varga's* job (she gains rep, the drive is the prize). The coherent,
high-value beat: if the player **sells the drive to Varga's rivals** (`flag.sold_drive`), Varga finds out
and her next conversation changes — the "world remembers" pillar that the reactions system exists to serve
(see `reactions.ts` docstring, GOAL Pillar).

This adds one `reactsTo` entry to `npc.varga` plus a new `dialogue.varga_betrayed`. Because the reactions
system applies **every** matching reaction in array order and the **last** `overrideDialogueId` wins, the new
reaction is appended **last** so it supersedes the entry-method follow-ups (peace/sneak/force) when the
player has both entered the warehouse *and* sold the drive — the betrayal is the more recent, dominant beat.
It also latches a persistent `flag.varga_knows_betrayal` consequence (mirroring the existing
`flag.syndicate_marked` pattern), a hook for future content.

**Impact:** the SPEC-50 "sell" choice now has a visible, persistent consequence; both quests matter more.
No engine/schema change (uses the existing `reactsTo` mechanism); content-only.

## Files (in scope)
- `content/core/pack.opening/pack.json` (one `reactsTo` entry on `npc.varga` + one new `DialogueAsset`).
- `content/core/pack.opening/ink/varga_betrayed.ink` (new; compiled via `content:compile-ink`).
- `packages/app-web/test/reactive-payoff.spec.ts` (extend: the sold-drive reaction; existing cases unchanged).

## Out of scope
- Reactions to `flag.cracked_drive` / `flag.leveraged_syndicate` (leave as future hooks — author one payoff
  well rather than three thin ones; GOAL §3 "content demands it" discipline).
- Any engine/schema/loader change. Any change to the SPEC-50 pack.

## DoD + Acceptance
- [ ] `npc.varga.reactsTo` gains a final entry: `when: [flag_is flag.sold_drive == true]`,
      `setsFlags: [flag.varga_knows_betrayal → true]`, `overrideDialogueId: dialogue.varga_betrayed`.
- [ ] `dialogue.varga_betrayed` (Ink) authored + compiled into pack.opening; plays through `InkNarrative`.
- [ ] `pack.opening` still loads **in isolation** (replay-fuzz green) — `flag.sold_drive` is runtime state,
      not a registry ref, so no cross-pack integrity dependency is introduced.
- [ ] Recompiling pack.opening's Ink leaves the **existing** dialogue blobs byte-unchanged (deterministic
      compiler, pinned inkjs) — verified via the git diff (only the new dialogue + reactsTo entry change).
- [ ] `reactive-payoff.spec.ts`: after `flag.sold_drive`, Varga's active dialogue is `dialogue.varga_betrayed`
      and `flag.varga_knows_betrayal` latches; and when sold_drive co-occurs with an entry-method flag, the
      betrayal override **wins** (ordering). Existing peace/sneak/force cases stay green (they don't set sold_drive).
- [ ] `pnpm verify` green; production build green; `pnpm e2e` 4 passed; golden untouched; `pnpm audit` clean.

## Test strategy
Extend `reactive-payoff.spec.ts` (which already drives `reactionsSystem` + `DialogueController.openFor`):
add a case setting `flag.sold_drive` (alone, and alongside `flag.entered_peacefully` to prove last-wins
ordering), assert `open.dialogueId === "dialogue.varga_betrayed"` and `world.flags["flag.varga_knows_betrayal"]`.
The existing four cases are untouched and must remain green (they never set `sold_drive`).
