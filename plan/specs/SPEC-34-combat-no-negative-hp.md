# SPEC-34 — Combat "no negative HP" invariant test (mutation-informed)

- **Status:** Done · **Pillar:** Quality · **Wave:** Cycle-4 P0 · **Cycle:** 4

## Description & impact
SPEC-30's mutation baseline (73.31%) surfaced `combat.ts`/`apply.ts` as under-hardened. Investigation
showed the engine's **named safety invariants are already tested** (reputation clamp, no-negative-inventory,
modify_skill floor) — so a broad mutation-chase would be low-value churn (SPEC-30 explicitly says don't
bulk-fix). **One genuine gap remained:** GOAL §5.8 names *"no NPC has negative HP"* as a contract, but the
existing combat test stops attacking once the guard dies, so the **overkill / post-mortem clamp** at
`apply.ts:264` (`hp = Math.max(0, …)` + `alive: hp > 0`) was never exercised at its boundary. This adds that
one focused, readable invariant test. Purely additive; zero behavior change.

## DoD & acceptance
- A test in `combat.test.ts` applies `ResolveAttack` repeatedly **past death** and asserts HP is `>= 0` at
  every step, clamps to exactly `0`, and `alive === false` at HP 0.
- `pnpm verify` green. No production code changed.

## Approach
`packages/engine-core/src/systems/combat.test.ts` — add `withGuard(3,4)` + a 12× `ResolveAttack` loop with
per-step `>= 0` assertion. No mutation-chasing beyond this single named-invariant gap.

## Test strategy
The test IS the deliverable. (Optional) re-run `pnpm mutation` to confirm the combat/apply clamp mutants are
now killed — but the score is report-only and not a gate.
