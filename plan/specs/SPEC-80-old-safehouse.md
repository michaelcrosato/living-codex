# SPEC-80 — Amnesia payoff destination: the Old Safehouse (gated exit)

**Wave:** Cycle-8 / C8-P2 (content depth — pay off the amnesia thread with a destination). **Risk:** LOW
(additive geography + a gated exit in pack.opening; uses the established exit.requires mechanism). Reversible.

## Description + Impact
SPEC-73 ("What You Forgot") lets the player learn their origin (`flag.learned_origin`) but the thread had no
destination. This adds `location.old_safehouse` — a quiet personal space the player suddenly remembers —
reachable from the hub only via an exit gated by `requires:[flag_is learned_origin == true]` (the
engine-enforced exit gate, interaction.ts; already used by drip_market's skill-gated exit, so not a new verb).
Its (now-surfaced, SPEC-71) ambientText delivers the personal payoff. The amnesia thread now leads somewhere.

## Files (in scope)
- `content/core/pack.opening/pack.json` — `location.old_safehouse` (geography) + a `learned_origin`-gated
  `ashfall_district → old_safehouse` exit.
- `packages/app-web/test/old-safehouse.spec.ts` (new) — the gate (barred without the flag, open with it) + reachability.

## Out of scope
- An on-enter reward/NPC (locations have no onEnter effect; the surfaced ambientText is the payoff). New verbs.

## DoD + Acceptance
- [ ] `content:validate`/`content:verify` OK — the safehouse is reachable (exit target, not an island),
  canon-consistent, 0 hygiene warnings; pack.opening loads in isolation (replay-fuzz green).
- [ ] `old-safehouse.spec.ts`: with the player at the exit, `UseExit` is BARRED (no EnterLocation) without
  `flag.learned_origin`, and OPENS (EnterLocation to old_safehouse) with it — via the real `interactionSystem`.
- [ ] `pnpm verify` green; build + e2e 4 passed (cold-open slice unaffected — the exit is barred there);
  golden untouched; audit clean.

## Test strategy
Load `[opening]`; place the player at the new exit's `at`; drive `interactionSystem([{UseExit}])` and assert
no `EnterLocation` without `learned_origin` (a `ShowText` "barred" instead), then set the flag and assert
`EnterLocation` to `location.old_safehouse`. Mirrors the engine's existing locked-exit test.
