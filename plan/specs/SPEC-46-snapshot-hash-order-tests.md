# SPEC-46 — Pin the snapshot hash's key-order-independence

- **Status:** Done · **Pillar:** Quality / Determinism · **Wave:** Cycle-6 P0 (REPLENISH, data-driven) · **Cycle:** 6

## Description & impact
Completing the data-driven engine-core sweep (SPEC-44/45), `snapshot.ts` (43.75%) got the same survivor
inspection. The split, again, was clean:
- **cyrb53 internals** (loop bound line 31, combine arithmetic line 40, `padStart` char line 41) — correctly
  low-value: hash *determinism* is the tested contract; pinning exact hash bytes is brittle golden-hashing.
- **`sortKeys` key-order normalization** (`Object.keys(record).sort()` line 22 + the object branch line 19)
  — a **genuine gap**. The docstring calls this "the foundation of the replay invariant": two
  structurally-equal worlds must hash identically *regardless of key insertion order*. Yet no test pinned
  it — `replay.test` re-runs the *same* world (identical key order), so a mutant dropping `.sort()` (making
  the hash key-order-dependent) or skipping the recursive object branch (nested keys unsorted) **survived**.
  A regression there would break the replay invariant subtly and silently.

## DoD & acceptance
- New `snapshot.test.ts` pins: object hash is **independent of top-level key order**, **independent of
  nested key order** (recursion), **sensitive** to content (different key/value → different hash),
  **order-significant for arrays** (arrays are not key-sorted), deterministic, and serialize/deserialize
  round-trips. All real execution; `pnpm verify` green.
- `snapshot.ts` mutation rises from 43.75%; the `sortKeys` survivors (line 19 + 22) are killed. Residual =
  the intentionally-not-chased cyrb53 internals.

## Approach
Additive test only — `snapshot.ts` is correct; the gap was coverage. `hash` is exercised on crafted values
cast to `World` (sortKeys works structurally on any JSON value; the type is incidental, the documented
order-independence contract is the point). No production change.

## Test strategy
Real execution (`hash(a) === hash(b)` for key-reordered structures; `!==` for reordered arrays / differing
content); re-run `pnpm exec stryker run --mutate .../snapshot.ts` to confirm the sortKeys arm is covered.
