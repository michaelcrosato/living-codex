# SPEC-54 — Decrypt-path payoff: a salience storylet for knowing the Syndicate's secret

**Wave:** Cycle-7 / C7-P1 (narrative completeness). **Risk:** LOW (additive storylet in an already-shipped
pack; no engine/schema change). Reversible.

## Description + Impact
SPEC-50 gave the player three ways to handle the drive; SPEC-52 paid off the **sell** branch (Varga's
betrayal reaction), and the **leverage** branch already pays off via its `+8 varga_crew` reputation. The
**decrypt** branch (`flag.knows_syndicate_secret`) is the only choice with **no world acknowledgment** — a
dangling consequence. This closes the consequence space symmetrically with a fire-once **salience storylet**
(the SPEC-11/24 system, which surfaces in the live HUD per SPEC-24) that fires once the player has cracked
the drive — acknowledging that they now hold the Syndicate's secret. A storylet (not an NPC reaction) is the
right vehicle: it carries no reaction-ordering precedence (unlike piling another `reactsTo` on Varga), and
ambient salience content is exactly what storylets exist for.

**Impact:** all three Syndicate-drive choices now have a visible consequence; the decrypt branch is no
longer a dead end. Faction-tagged (`ashfall_syndicate`) so it is drama-manager-eligible (SPEC-32).

## Files (in scope)
- `content/core/pack.syndicate_offer/pack.json` (add one `Storylet`).
- `packages/app-web/test/syndicate-offer.spec.ts` (add a GameSession firing test, storylet-barks pattern).

## Out of scope
- Any new verb/effect or any engine/schema change. Any reaction on an NPC. The other two branches (already
  paid off). Making the secret *usable* as future leverage (no consumer exists yet — that's a future spec
  when content demands it, GOAL §3).

## Design
`storylet.knows_secret` in `pack.syndicate_offer`:
- `preconditions: [flag_is flag.knows_syndicate_secret == true, not(flag_is flag.bark_knows_secret_seen == true)]`
- `salience: 5`, `tags: ["ashfall_syndicate"]`
- `content.ambient`: a line reflecting that the player now knows what the Syndicate buried.
- `effects: [set_flag flag.bark_knows_secret_seen → true]` (fire-once, the district_barks pattern).

It does not compete with `storylet.broker_watching` (gated on `¬flag.syndicate_resolved`, which the decrypt
branch's `onAnyComplete` sets) — after resolution only the knows-secret bark is eligible.

## DoD + Acceptance
- [ ] `pnpm content:validate` OK (still 7 packs); `pnpm content:verify` OK — the new storylet is satisfiable,
      no orphan/contradiction warnings, canon consistent.
- [ ] `syndicate-offer.spec.ts` (GameSession, storylet-barks pattern): with `flag.knows_syndicate_secret`
      seeded, `storylet.knows_secret` is an eligible TriggerStorylet candidate; after it fires it does NOT
      fire again (fire-once); and the full session replays to an identical hash (determinism intact).
- [ ] `pnpm verify` green; test count rises. Pipeline golden-master untouched; `pnpm audit` clean.

## Test strategy
Mirror `storylet-barks.spec.ts`: build a `GameSession` over `[opening, syndicate_offer]` with
`seedEvents: [SetFlag flag.knows_syndicate_secret]`, step it, assert the storylet is in the TriggerStorylet
candidates, step again and assert it is gone (its effect set the `_seen` flag a precondition excludes), and
assert `hash(replay(log)) === hash(live)` so storylet selection stayed deterministic.
