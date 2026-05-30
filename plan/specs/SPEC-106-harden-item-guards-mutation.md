# SPEC-106 — Mutation-harden the SPEC-104/105 item guards (kill 3 genuine survivors)

**Wave:** Cycle-10 P0 (safety-gate self-verification) · **Risk:** LOW (test-only) · **Status:** Todo

## Description + Impact

`playability.ts` is the most safety-critical file in the thesis (the schema-valid≠playable gate) but —
unlike engine-core — it is **not** in the committed Stryker `mutate` scope, so its mutation coverage was
unmeasured. A focused `stryker run --mutate playability.ts` (2026-05-30) measured it at **75.00%** and
surfaced **3 genuine survivors in the just-added SPEC-104/105 code** — behaviors no test pins:

| Survivor | Mutation | Gap |
|----------|----------|-----|
| `:294` `rewards.credits > 0` | `→ >= 0` / `→ true` | credits=100→obtainable is tested, but credits=0→**not** obtainable (item.credits unguarded) is not — the boundary that mirrors the engine's `quests.ts:27` credit-grant. |
| `:298` `skill_check.onFail` item collection | block emptied | no test uses a `give_item` inside a `skill_check.onFail` as the *only* item source. |
| `:323` `cond.kind === "all" \|\| "any"` | `→ "all" \|\| false` | the recursion test covers `all`/`not` but never `any`. |

Killing these pins three real contracts of the guard (credits boundary mirrors the engine; skill_check
onFail is a genuine item source; the item-gate recursion covers `any`), strengthening the gate's
self-verification. Mutation-informed, correctness-pinning — the SPEC-44…48 pattern, not number-chasing.

## Approach (files / patterns)

Test-only: `packages/content-loader/src/playability.test.ts`. Add 3 targeted cases to the existing
SPEC-104/105 describe blocks. No production change. (The broader "content-loader is not in the permanent
mutation scope" finding → BACKLOG, not built speculatively.)

## DoD + acceptance

- [ ] `retrieve item.credits` with a quest that awards **no** credits (credits=0) → **warns** (kills `:294`).
- [ ] an item granted **only** by a `give_item` in a `skill_check.onFail` → retrieve on it → **no** warning
      (kills `:298`).
- [ ] a `has_item` nested in an `any` gate on an ungranted item → **warns** (kills `:323`).
- [ ] `pnpm verify` EXIT 0; a re-run `stryker run --mutate playability.ts` shows `:294/:298/:323` killed.
- [ ] golden untouched; `pnpm audit` clean.

## Test strategy

Three cases as above, reusing the `check()`/`quest()`/`retrieveQuest()` helpers. Assert `errors` stays
empty (warning-only). Re-run the focused Stryker mutation to confirm the three survivors flip to killed.
