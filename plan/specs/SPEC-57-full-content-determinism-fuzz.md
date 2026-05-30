# SPEC-57 — Full-content determinism fuzz (replay-exactness over the live pack set)

**Wave:** Cycle-7 / C7-P0 (determinism robustness — the core GOAL §5 guarantee). **Risk:** LOW (new test
only; no production code change). Reversible.

## Description + Impact
The two property-based determinism suites — SPEC-05 `replay-fuzz` and SPEC-31 `model-based` — both load
**only `pack.opening`**. This session added new event-folding content paths that run in the live
`GameSession` pipeline (verified: `reactionsSystem`/`questSystem`/`storyletSystem` are all in `session.ts`):
the SPEC-52 Varga reaction, the SPEC-55 Kestrel reactions, the SPEC-50 syndicate quest, and the SPEC-50/54
storylets. Their determinism is covered only by **scenario** tests (specific seeded cases). Nothing
property-fuzzes random play with the **full live pack set loaded and the new reactions/storylets active** —
so a replay divergence introduced by cross-pack content interaction would go uncaught. The replay invariant
(`hash(replay) === hash(live)`) is the project's central guarantee (GOAL §5); it should be fuzzed over what
the app actually boots, not just the base pack.

This adds a focused `fc.commands` suite that loads the **exact live pack set** (opening + district_barks +
drip_market + syndicate_offer + kestrel + the_drip_patrons), seeds a flag state that **activates the new
reactions + storylets** (so their event-folding executes during the run), drives random command sequences,
and asserts replay-exactness + basic conservation after **every** command, with shrinking.

**Impact:** the new content is now covered by the same per-step replay-determinism guarantee as the base
pack — closing the one robustness gap this session's content opened. Finds 0 divergences if (as expected)
the new content is replay-clean; a divergence would be a real GOAL §5 bug surfaced with a minimal trace.

## Files (in scope)
- `packages/app-web/test/full-content-determinism.spec.ts` (new; SPEC-31 harness pattern).

## Out of scope
- Any production code change. Replacing/altering the SPEC-05/31 suites (they stay focused on pack.opening;
  this complements them). Deep narrative-correctness assertions (this is a determinism suite).

## DoD + Acceptance
- [ ] Loads the exact six live packs through `loadPacks` (matching `main.ts`).
- [ ] Seeds `met_varga`, `has_drive`, `knows_syndicate_secret`, `sold_drive`, `sided_with_kestrel` so the new
      Varga + Kestrel reactions and the syndicate storylets are eligible during the run.
- [ ] Command arbitraries cover Move/Interact/Attack/UseExit/Attempt(the_warehouse + syndicate_offer branches);
      after every command asserts `hash(replay(log)) === hash(live)`, `credits ≥ 0`, all `hp ≥ 0`, player persists.
- [ ] Seed-pinned, bounded (`numRuns` ~30, `maxCommands` ~12) — no flake; a divergence shrinks to a minimal trace.
- [ ] `pnpm verify` green; `pnpm replay:verify` still selects + passes; test count rises. No production diff.

## Test strategy
Clone the SPEC-31 `model-based.spec.ts` structure: a tiny model (`steps`), a `Real` holding the session +
opts + fingerprint, `checkInvariants` doing the per-step replay hash compare + conservation, `cmd()` wrapping
one `session.step([input])`, and `fc.commands` over the arbs via `fc.modelRun`. The only differences:
load the full live pack set and seed the activator flags in `makeOpts().seedEvents`. Pin the seed; keep runs
bounded. The existing `model-based`/`replay-fuzz` suites are untouched.
