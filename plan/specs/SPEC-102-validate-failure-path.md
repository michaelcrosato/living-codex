# SPEC-102 — Test validatePack's readable-rejection failure path

**Wave:** Cycle-9 / C9-P0 (coverage — content-safety layer). **Risk:** LOW (test-only). Reversible.

## Description + Impact
`validatePack` (content-loader) is the content-safety layer's readable rejection of bad content — when
AI/authored output fails the schema, it throws an error naming WHERE (field path) + WHY (message) + the pack
label. The success path was exercised by load.test, but the FAILURE path (building the readable error from
Zod issues, the `(root)`/`(unknown)` fallbacks) was uncovered (16.66% branch). Added validate.test pinning it.

## DoD + Acceptance
- [x] validate.test +4: valid→parsed; invalid→error naming label + field; no-label→"(unknown)"; pathless
  issue→"(root)". pnpm verify EXIT 0 (333); golden untouched; audit clean.
