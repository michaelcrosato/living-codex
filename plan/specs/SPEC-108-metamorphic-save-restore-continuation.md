# SPEC-108 — Metamorphic property: save/restore is transparent to continued play

**Wave:** Cycle-10 P0 (determinism robustness) · **Risk:** LOW (test-only) · **Status:** Todo

## Description + Impact

REPLENISH research (2026 frontier scan): **metamorphic testing paired with deterministic simulation**
is a recurring 2026 best practice for game/sim engines (MarkTechPost PBT guide; arxiv metamorphic-PBT;
Antithesis deterministic-simulation-testing). This repo has property-based (fast-check), differential
(`hash(replay)===hash(live)`), and replay-determinism tests — but **no explicit metamorphic
save/restore-continuation relation**.

The untested property: snapshot hashing normalizes key order (`sortKeys`, SPEC-46), so a
save → JSON round-trip → restore could alter Map/object iteration order (or lose/precision-shift a
field) in a way the **save-point hash equality cannot see**, yet which would diverge on **continued
play** if any system leaked iteration-order dependence. SPEC-78's test only asserts restore → identical
hash *at the save point* and that the loop runs — not that the *continuation* matches uninterrupted
play. This is exactly the subtle determinism bug class metamorphic testing targets, and it goes through
the **real JSON serialization** path (`makeSave` → `JSON.stringify`/`parse` → `loadSave` → `restore`).

Metamorphic relation:

```
play(seed, A ++ B)  ≡  restore( jsonRoundTrip( makeSave( play(seed, A) ) ) ).play(B)
```

i.e. saving mid-session, JSON round-tripping the envelope, restoring, and continuing with B yields the
**identical final world hash** as playing A then B without interruption. Offline, deterministic, fast.

## Approach (files / patterns)

New `packages/app-web/test/save-restore-metamorphic.spec.ts`. Reuse the SPEC-57 harness shape (load the
live pack set, `makeOpts()` seed). fast-check: generate `fc.array(inputArb)` + a split point; A =
prefix, B = suffix. Control session plays A++B; metamorphic session plays A, `makeSave(world, [], fp)`,
`JSON.parse(JSON.stringify(envelope))`, `GameSession.restore(...)`, plays B. Assert
`hash(restored.world) === hash(control.world)`. Seed-pinned, `numRuns` ~40.

Soundness note: the restored session marks only its current location spawned, but `spawnNpc` is
idempotent (skips existing entities, carried in the snapshot) so a B-driven re-entry emits no events and
cannot cause false divergence — confirmed against `session.ts`.

## DoD + acceptance

- [ ] The metamorphic equality holds across the fuzzed input space (the property passes).
- [ ] Goes through real JSON serialization (`JSON.stringify`/`parse` of the `SaveEnvelope`).
- [ ] Harness is catch-proven once during dev (a deliberate perturbation makes it fail, then reverted).
- [ ] `pnpm verify` EXIT 0; replay:verify still green; golden untouched; `pnpm audit` clean.

## Test strategy

Property test as above (test-only, no production change). Confirm it fails under a planted perturbation
(e.g. mutate one inventory value post-restore) to prove the assertion has teeth, then revert.
