# SPEC-90 — Content-safety gate robustness: order-independence + subset-safety

**Wave:** Cycle-9 / C9-P0 (harden the thesis core). **Risk:** LOW (test-only). Reversible.

## Description + Impact
The loader (loadPacks + integrity) is the thesis boundary ("AI content can't break the game"). Two robustness
properties were unit-tested only by example; this adds property tests over the REAL 10 live packs:
1. **Order-independence** — the resolved registries fingerprint is identical for ANY permutation of the packs
   (so generation/curation order can never change what loads). 30 shuffled runs.
2. **Subset-safety** — each pack loaded ALONE either loads cleanly OR throws a clean integrity `Error` (the
   SPEC-35/42 cross-pack-exit trap), never an unexpected crash (TypeError/undefined).

## DoD + Acceptance
- [x] `loader-robustness.spec.ts`: fc.shuffledSubarray permutations → same registriesHash; each pack-alone
  load either succeeds or throws an Error-with-message. `pnpm verify` green (311); golden untouched; audit clean.
