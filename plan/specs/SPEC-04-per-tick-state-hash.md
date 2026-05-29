# SPEC-04 — Per-tick state-hash divergence trace

- **Status:** Todo · **Pillar:** Quality/Determinism · **Wave:** 1 · **Priority:** P=11
- **I**=4 **F**=4 **R**=2 **Ft**=5

## Description
We assert `hash(replay(log,seed))===hash(live)` only at the *end*. When it ever fails, you know *that* it
diverged, not *where*. Add a per-tick hash trace so a divergence is **bisectable to the first differing tick**
— the standard deterministic-sim debugging tool (flagged by two research agents: [Bugnet desync](https://bugnet.io/blog/how-to-debug-multiplayer-desync-issues-in-games),
[Gaffer](https://gafferongames.com/post/fix_your_timestep/)). Additive and dev/CI-only — **does not change the
shipped `ReplayLog` format**.

## Acceptance Criteria
- A pure helper (engine-core) produces a per-tick hash trace during replay, e.g.
  `replayTrace(log): { tick:number; hash:string }[]` (reusing `state/snapshot.ts` `hash()`), and a
  `firstDivergence(a, b): { tick:number; aHash:string; bHash:string } | null` comparator.
- The existing replay invariant test (`state/replay.test.ts`) uses it to produce a **precise failure message**
  ("diverged at tick N") instead of a bare hash-mismatch.
- A new test injects an artificial divergence (e.g. replay with a perturbed entry) and asserts
  `firstDivergence` returns the correct tick — proving the tool *finds* divergence.
- The shipped `ReplayLog`/`SaveEnvelope` types are unchanged; trace is computed on demand, not stored.
- `hash()` operates on a **canonical serialization** (stable key order) — confirm `snapshot.ts` already
  canonicalizes; if not, note it (do not silently change hashing semantics — that would move the golden/replay baselines).
- `pnpm verify` + `pnpm replay:verify` green.

## Implementation approach
Read `state/snapshot.ts` (hash + serialize) and `events/log.ts` (replay). Add `replayTrace` next to `replay`
(or in snapshot) folding events one-by-one and recording `{tick, hash(world)}` at each `AdvanceTick`/entry
boundary consistent with the §8 tick order. Export both helpers from `engine-core/src/index.ts`. Keep them
pure. Wire the invariant test's assertion message through `firstDivergence`.

## Files
- `packages/engine-core/src/state/snapshot.ts` or `events/log.ts` (+ export in `index.ts`),
  `packages/engine-core/src/state/replay.test.ts`.

## Dependencies / prereqs
None. Pairs with SPEC-05 (the fuzzer can reuse `firstDivergence` to report the minimal divergent tick).

## Test strategy
Determinism: trace of `replay` equals trace of a freshly stepped live session, tick-for-tick. Negative test:
a perturbed log diverges at the expected tick. Reproducible (seeded). `pnpm replay:verify`.

## Effort
S–M (~1.5 hr).

## Out of scope
Changing the hash algorithm or serialization; storing the trace in saves; multi-machine determinism (we're a
single V8 runtime — fixed-point math is a BACKLOG concern only if we ever fork to native).
