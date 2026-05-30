# SPEC-45 — Pin `deserializeRng`'s corrupt-save validation

- **Status:** Done · **Pillar:** Quality / Robustness · **Wave:** Cycle-6 P0 (REPLENISH, data-driven) · **Cycle:** 6

## Description & impact
Continuing the data-driven engine-core re-measure (see SPEC-44): inspecting `rng.ts`'s survivors instead of
trusting the BACKLOG "low-risk" label, the cluster split cleanly:
- **sfc32 arithmetic** (`nextUint32`, lines 38–43) — survivors here are **correctly low-value**: the tested
  contract is *determinism* (same seed → same sequence) + bounds, which mutated arithmetic preserves;
  pinning exact PRNG outputs would be brittle golden-value chasing. Deliberately **not** chased.
- **`deserializeRng` validation** (line 75, `parsed.some(n => typeof n !== "number" || !Number.isFinite(n))`)
  — a **genuine gap**. This is a real system boundary (SPEC-10 loads a *persisted, possibly corrupt* RNG
  state from storage). The existing test covered not-an-array + wrong-length, but **not** the per-element
  arm — so a regression dropping the number/finite check could load a corrupt state into the single source
  of game randomness, breaking determinism. Validating untrusted input at a boundary is exactly where
  validation belongs.

## DoD & acceptance
- Extend the "rejects malformed serialized state" test to cover every arm: not-array, both wrong-lengths,
  a non-number element, a `null` element, and a non-finite element (`1e999` → `Infinity` via `JSON.parse`).
- All throw (real execution); `pnpm verify` green.
- `rng.ts` line-75 validation survivors are killed (scoped re-mutation); the residual survivors are only the
  intentionally-not-chased sfc32 arithmetic + the throw-message string.

## Approach
Additive assertions to the existing test — `deserializeRng` is correct; the gap was coverage. No production
change.

## Test strategy
Real execution (`deserializeRng` throws on each corruption class); re-run `pnpm exec stryker run --mutate
.../rng.ts` to confirm the validation arm is now covered. Mutation report-only (not a gate).
