# SPEC-98 — Test the bake step (finalizeProvenance)

**Wave:** Cycle-9 / C9-P0 (close a coverage gap on the generation→disk path). **Risk:** LOW (test-only).
Reversible.

## Description + Impact
`bake.ts`'s `finalizeProvenance` (CONTENT_PIPELINE §2.6) stamps human-curation provenance (curatedBy +
approvedAt) onto an approved candidate and RE-VALIDATES it against the treaty before it's written to
content/generated/ — and had NO test. Added bake.test.ts: stamps the fields while preserving the generated
content + origin provenance (authoredBy/models/promptHash); a non-ISO approvedAt is REJECTED (can't bake an
invalid pack); and the input candidate is not mutated.

## DoD + Acceptance
- [x] bake.test +3 (stamp+preserve; invalid-approvedAt throws; no input mutation). pnpm verify green (321);
  golden untouched; audit clean.
