# SPEC-55 — Kestrel reacts to the loyalty choice (the rival's POV)

**Wave:** Cycle-7 / C7-P1 (reactive depth on freshly-live content). **Risk:** LOW-MED (touches pack.kestrel
content + adds reactions; additive; covered by tests). Reversible.

## Description + Impact
SPEC-51 made `pack.kestrel`'s rival-fixer quest (`quest.rival_offer`) reachable in the live app. Its central
choice — side with the rival (`flag.sided_with_kestrel`), stay loyal to Varga (`flag.refused_kestrel`), or
play both (`flag.played_both`) — is the game's core loyalty tension, but currently only the reputation delta
records it; **Kestrel herself never acknowledges what you chose**. This adds reactive follow-up dialogue on
`npc.kestrel`: talk to her after the quest and she's warm if you took her job, cold if you refused.

Deliberately scoped to Kestrel's own `reactsTo` (not another reaction on Varga — that NPC's reaction set is
already at four and piling cross-quest reactions there makes precedence array-order-arbitrary, the fragility
flagged in SPEC-52/53/54). The two triggers (`sided_with_kestrel` / `refused_kestrel`) are mutually
exclusive quest outcomes, so there is **no ordering ambiguity**. This is reactive *dialogue* (distinct from
SPEC-52's reaction-on-Varga and SPEC-54's salience storylet) — the rival's perspective on the loyalty beat.

**Impact:** the now-live rival quest's central choice gains a visible, in-character payoff; the "world
remembers" pillar covers both fixers, not just Varga.

## Files (in scope)
- `content/core/pack.kestrel/pack.json` (two new `DialogueAsset`s + two `reactsTo` entries on npc.kestrel).
- `content/core/pack.kestrel/ink/kestrel_sided.ink`, `…/kestrel_refused.ink` (new; compiled via content:compile-ink).
- `packages/app-web/test/rival-fixer.spec.ts` (extend: the two reactions; existing cases unchanged).

## Out of scope
- A `played_both` follow-up (leave Kestrel's default offer line for the ambiguous outcome — author the two
  decisive poles well rather than three; consistent with SPEC-52's "one payoff well" discipline).
- Any engine/schema/loader change; any reaction on a different NPC; any change to the rival quest itself.

## DoD + Acceptance
- [ ] `npc.kestrel.reactsTo` gains two entries: `when [flag_is flag.sided_with_kestrel == true] → dialogue.kestrel_sided`
      and `when [flag_is flag.refused_kestrel == true] → dialogue.kestrel_refused` (mutually exclusive triggers).
- [ ] Both Ink dialogues authored + compiled into pack.kestrel; recompiling leaves the existing
      `dialogue.kestrel` blob **byte-unchanged** (verified via git diff).
- [ ] `pnpm content:validate` / `content:verify` OK (refs resolve; no orphan warning — both new dialogues are
      referenced by the reactions; canon consistent).
- [ ] `rival-fixer.spec.ts`: after `flag.sided_with_kestrel`, Kestrel's active dialogue is
      `dialogue.kestrel_sided`; after `flag.refused_kestrel`, it is `dialogue.kestrel_refused`; with neither,
      it is the default `dialogue.kestrel`. Existing rival-fixer cases stay green.
- [ ] `pnpm verify` green; production build green; `pnpm e2e` 4 passed; golden untouched; audit clean.

## Test strategy
Extend `rival-fixer.spec.ts` with a reactions block modeled on `reactive-payoff.spec.ts`: load
`[kestrel, opening]`, build a `DialogueController(registries, InkNarrative)`, set a flag, run
`reactionsSystem(registries.npcs)`, and assert `controller.openFor(world, "npc.kestrel").dialogueId`. Cover
sided / refused / neither. Existing same-path load + quest-play cases are untouched.
