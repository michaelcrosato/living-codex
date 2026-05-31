# SPEC-119 — Fix: a `retryable: true` skill_check soft-locks the quest on first failure

**Wave:** Cycle-11 P0 (engine correctness) · **Risk:** LOW · **Status:** Todo

## Description + Impact

**Genuine engine bug** (found by an adversarial bug-hunt, confirmed by code trace — not speculative).
A quest branch with a `skill_check` objective declaring `retryable: true` **soft-locks permanently on
its first failure**: it can neither re-roll nor foreclose, so the branch can never complete and the quest
can never fail.

Trace (`packages/engine-core/src/systems/quests.ts` + `events/apply.ts`):

1. First `Attempt` → `quests.ts:136` guard `(!progress || progress.attempts === 0)` holds → emits
   `ResolveSkillCheck`.
2. `apply.ts:158-162` folds it: on failure `objectiveProgress[key] = { done:false, failed:true,
   attempts:1 }`. **Nothing ever resets `attempts`** — the `mark()`/`MarkObjective` path
   (`apply.ts:207-215`, which preserves `prev.attempts`) is used only for the non-`skill_check` objective
   kinds; a `skill_check` key's sole writer is `ResolveSkillCheck`, which only ever does `attempts + 1`.
3. Next `Attempt`: the foreclose guard `quests.ts:107` (`progress.failed && !retryable`) is **skipped**
   because `retryable` is true (correct — a retryable check shouldn't foreclose). But the re-roll guard
   `quests.ts:136` now fails (`attempts === 1`, not `0`) → **no `ResolveSkillCheck` emitted**.

Net: the objective is pinned `failed:true, done:false` forever. `retryable: true` does the **opposite of
its name** — its only runtime effect is to disable the foreclosure that is the lone exit from a failed
check, while the `attempts === 0` guard blocks the retry it promises.

This violates the project thesis ("if content validates, the engine runs it"): `retryable` is a
first-class schema field (`content-schema/src/quest.ts`, `z.boolean().default(false)`), documented in
`docs/WORLD_STATE.md §3.2` and `docs/SCHEMA.md §4`, so a generator (or author) emitting schema-valid
`retryable: true` produces an **unwinnable** quest — and the content-safety gate can't catch it (the
content is valid; the *engine* mishandles it). Latent today (no live pack sets `retryable: true`,
verified), but real, cheap, and well-isolated. It is **not** a determinism break — the soft-lock is
deterministic and replay-exact; this is a gameplay-logic/unwinnability defect.

## Approach (files / patterns)

`packages/engine-core/src/systems/quests.ts` — one-line widening of the re-roll guard (line ~136) so a
**failed retryable** check re-rolls when (and only when) the player explicitly attempts the branch again:

```ts
if (
  attempted(quest.id, branchId) &&
  (!progress || progress.attempts === 0 || (retryable && progress.failed))
) { … ResolveSkillCheck … }
```

- Non-retryable failed checks are unaffected: `quests.ts:107` already forecloses them before this switch
  is reached, and `(retryable && progress.failed)` is false for them anyway.
- A succeeded check (`done:true`) is skipped by the objective-advance `while` loop (`quests.ts:95-100`),
  so it never re-rolls after success.
- Re-roll fires only on an explicit `Attempt` input for that branch (honest agency, S1.3): one roll per
  attempt; `attempts` keeps counting (no cap needed — that'd be a separate feature). No engine RNG is
  consumed off the replay path (the roll stays inside the `ResolveSkillCheck` fold). Determinism intact.

No schema/doc change — the fix aligns the code to the **already-documented** behavior of `retryable`.

## DoD + acceptance

- [ ] New test in `quests.test.ts` proves: a FAILED `retryable: true` skill_check (a) emits a second
      `ResolveSkillCheck` on the next `Attempt` (re-roll), (b) does NOT `ForecloseBranch`, and (c) with no
      `Attempt` that tick emits neither (agency). The test FAILS before the fix (no second roll) and
      PASSES after.
- [ ] The existing non-retryable foreclose test still passes (regression: non-retryable path unchanged).
- [ ] `pnpm verify` EXIT 0 (gate commits on exit code — SPEC-99).
- [ ] Replay invariant holds (test T-04 / replay suites green); golden-master untouched; `pnpm audit` clean.

## Test strategy

`quests.test.ts` (extend): add a `retryableQuest()` helper (one branch, one
`{ kind:"skill_check", skill:"force", dc:30, retryable:true, onFail:[] }` objective — dc 30 vs skill 0 is
unbeatable, so the roll deterministically fails regardless of seed) + one `it` asserting the re-roll /
no-foreclose / agency behavior above via the existing `runQuest`/`activate`/`applyEvent` harness. The
focused proof is the second-`Attempt` re-roll (empty before the fix); `pnpm verify` is the gate.
