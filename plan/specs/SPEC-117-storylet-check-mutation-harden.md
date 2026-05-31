# SPEC-117 — Mutation-harden `storylet-check.ts` (focused Stryker)

**Wave:** Cycle-11 P0 (safety-net hardening) · **Risk:** LOW · **Status:** Done (test-only; focused mutation score 85%→**90.91%**; verify EXIT 0). Residual survivors are message-detail StringLiteral/Regex + the equivalent `if (!c) continue` guard — not chased (SPEC-30).

## Description + Impact

`unsatisfiablePreconditions` (`packages/content-loader/src/storylet-check.ts`) is the static
"can this storylet ever fire?" analysis behind SPEC-25's `content:verify` dead-storylet gate — a real
content-safety boundary (a contradictory-precondition storylet is dead content a generator can emit).
It lives in `content-loader`, which is **not** in the permanent Stryker `mutate` scope
(`stryker.config.json` = `engine-core` only; meta-finding logged in SPEC-106), so it has never been
mutation-measured. This applies the SPEC-44…48 / SPEC-106 / SPEC-110 focused-Stryker discipline to it.

This is **test-only** — the source is already clean (no dead code). Method: **measure first**
(SPEC-106 lesson — gate code hides survivors), identify the genuine survivors, add targeted tests.

## Approach (files / patterns)

1. Run focused `pnpm stryker run --mutate "packages/content-loader/src/storylet-check.ts"` to baseline
   the score and enumerate survivors.
2. Extend `packages/content-loader/src/storylet-check.test.ts` to kill the genuine survivors. The five
   existing tests already cover the detection arms (both negation orders, two-value flag, nested-`all`
   flatten, `any` no-false-positive), so the expected survivors are the **diagnostic-message detail**:
   the assertions use `toMatch(/flag\.X/)` (flag name only) and never pin the contradiction values or
   phrasing, so the `JSON.stringify(...)` value interpolations and the explanatory string fragments
   survive. Strengthen the three contradiction assertions to check the **full message** (the flag, the
   conflicting values, and the `never satisfiable` phrasing). Unlike the internal `where`-strings
   SPEC-39/40 deprioritized, these are author-facing contradiction explanations — pinning them is
   genuine output-quality coverage, not number-chasing.
3. Add an arm test for any *logic* survivor measurement surfaces that the five tests miss (none expected
   from static reading; the measurement decides).

No production source change; no schema/pipeline change.

## DoD + acceptance

- [ ] Focused `pnpm stryker run --mutate "packages/content-loader/src/storylet-check.ts"` reports a
      mutation score **≥80%** (record baseline → final + residual rationale in PROGRESS/JOURNAL).
      Residual may include equivalent mutants (e.g. the `if (!c) continue` defensive guard, which `pop`
      can never trip while `stack.length > 0`) — document, don't chase (SPEC-30).
- [ ] `pnpm verify` EXIT 0 (gate commits on the exit code — SPEC-99 lesson).
- [ ] `pnpm content:verify` output identical on the real packs (0 dead-storylet changes); golden-master
      untouched; `pnpm audit` clean.

## Test strategy

Extend `storylet-check.test.ts` only (no new file). Reuse the `flagTrue`/`flagFalse`/`not` helpers.
Assert full contradiction messages with `toContain`/exact strings (kills message + `JSON.stringify`
mutants) and `toBeNull()` for satisfiable cases (kills detection-predicate mutants). The focused Stryker
run is the measurement of record; `pnpm verify` is the gate.
