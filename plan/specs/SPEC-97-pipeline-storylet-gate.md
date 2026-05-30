# SPEC-97 — Pipeline storylet-path output passes the full gate

**Wave:** Cycle-9 / C9-P0 (thesis-hardening, parallel to SPEC-96). **Risk:** LOW (test-only). Reversible.

## Description + Impact
SPEC-96 gated the default (quest) generation cycle. The pipeline also has a storylet-generation path
(runWithStorylets, SPEC-26). Added a cycle-test assertion that its candidate — with the generated storylet —
also passes the full gate (loadPacks integrity + staticPlayabilityCheck + auditCanon), verifying the generated
STORYLET is satisfiable (SPEC-25) and the pack is playable + canon-consistent.

## DoD + Acceptance
- [x] cycle.test +1: the storylet-budget candidate (loaded w/ opening) passes staticPlayabilityCheck + auditCanon,
  with ≥1 generated storylet. pnpm verify green (318); golden untouched; audit clean.
