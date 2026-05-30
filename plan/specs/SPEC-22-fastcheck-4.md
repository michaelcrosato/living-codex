# SPEC-22 — fast-check 3 → 4 (keep determinism fuzz green)

- **Status:** Todo · **Pillar:** Quality · **Wave:** 7 · **Priority:** P=7
- **I**=2 **F**=3 **R**=3 **Ft**=5 · **MED risk — PBT major; a real divergence here is a real bug (R1).**

## Description
`fast-check` is at **3.23.2 → 4.x**. It powers the determinism fuzzing: SPEC-05's
`packages/app-web/test/replay-fuzz.spec.ts` (session-level input fuzz through the full
systems→events→apply→log path) and the applyEvent-level property test in
`packages/engine-core/src/state/replay.test.ts`. fast-check 4 has arbitrary-API changes (some `fc.*`
renames/removals, default `numRuns`/timeout tweaks). This is a **port, not a redesign** — keep the same
properties; only adapt to API changes.

## Acceptance Criteria
- `fast-check` at 4.x; `pnpm-lock.yaml` updated.
- `replay-fuzz.spec.ts` + `replay.test.ts` PBT pass **unchanged in intent**; **seeds stay pinned** for
  reproducibility; `numRuns` stays **bounded** (no CI slowdown — keep ~60 runs for the session fuzz).
- If the fuzz surfaces a **new divergence**, that is a genuine determinism defect (R1): shrink it to a
  minimal failing input sequence, file it, and fix or `git revert` — do **not** silence it.
- Full **`pnpm verify` + `pnpm replay:verify` green**.

## Implementation approach
Bump fast-check; reconcile any renamed arbitraries (records/options, `fc.bigInt`, `fc.constantFrom`, the
`fc.assert`/`fc.property` signatures); re-pin the seed; re-run the fuzz. Read the v4 migration notes.

## Files
- `package.json`, `pnpm-lock.yaml`, and the two PBT spec files **only if** API renames force edits.
  **No source collision.**

## Dependencies / prereqs
Network. Independent; can run in parallel with SPEC-21 (separate files), ideally each in its own worktree.

## Test strategy
Run the two PBT specs directly (`pnpm --filter @codex/app-web test` + the engine-core replay test) with a
fixed seed, then `pnpm verify`. Confirm no flakiness across a couple of seeds.

## Effort
S-M.

## Out of scope
A full `fc.commands` **model-based** state-machine suite (BACKLOG — valuable but a new test design, not a
port); new properties; raising run counts.
