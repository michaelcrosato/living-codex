# SPEC-93 — Convergence pair's other half: fully Varga's

**Wave:** Cycle-9 / C9-P2 (narrative depth — emergent allegiance states). **Risk:** LOW (one storylet).
Reversible.

## Description + Impact
The mirror of SPEC-92 (fully_syndicate): the player who stayed FULLY Varga's — inner circle (SPEC-64) +
refused Kestrel + NEVER joined the Syndicate — gets storylet.fully_varga ("loyalty for loyalty… everything
or the slowest way to die"). Completes the convergence PAIR for the two opposing endgame allegiances
(emergent states from combined choices, not parallel quests). In pack.varga_trust.

## DoD + Acceptance
- [x] storylet.fully_varga gated `all:[varga_inner_circle, refused_kestrel]` ∧ not(syndicate_made_member);
  fire-once. varga-trust.spec +1 (fires for the loyal player; excluded if they joined the Syndicate). pnpm
  verify green (315); build + e2e 4 passed; golden untouched; audit clean.
