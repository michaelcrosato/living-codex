# SPEC-38 — `met_marrow` Ink trigger so the Drip Market quest offers in-game

- **Status:** Done · **Pillar:** Player Experience · **Wave:** Cycle-5 P2 · **Cycle:** 5

## Description & impact
SPEC-35 made the Drip Market reachable, but `quest.market_debt`'s `offerWhen` requires `flag.met_marrow`
and nothing set it — so the quest never offered in-game (the district was walkable but inert). This wires
the trigger: Marrow's Ink sets a `met_marrow` var, which the dialogue system mirrors to `flag.met_marrow`
(`dialogue.ts:36` → `flag.<var>`; folded by `apply.ts:70`). Now talking to Marrow offers her quest —
completing the Drip Market's playable loop end-to-end.

## DoD & acceptance
- `drip_vendor.ink`: `VAR met_marrow = false` + `~ met_marrow = true` (set on entry); pack's
  `dialogue.drip_vendor.declaredVars = ["met_marrow"]`; Ink recompiled (`content:compile-ink`).
- A test asserts: the Ink reads `met_marrow === true` after a choice; `quest.market_debt` is NOT offered
  pre-dialogue and IS offered after a `DialogueAdvanced` mirrors `flag.met_marrow`.
- `pnpm verify` green; content validates/verifies; golden-master untouched (hand-authored content).

## Approach
Edit `content/core/pack.drip_market/ink/drip_vendor.ink` + the dialogue asset's `declaredVars`; recompile;
add the test to `drip-market.spec.ts`. No engine change (uses the existing declaredVars→flag mirror).

## Test strategy
Real execution: InkNarrative getVar + questSystem offer-gating before/after the flag. verify green.
