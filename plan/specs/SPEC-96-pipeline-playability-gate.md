# SPEC-96 — Pipeline output passes the full content-safety gate (not just schema)

**Wave:** Cycle-9 / C9-P0 (harden the thesis: the generator emits PLAYABLE content). **Risk:** LOW
(test-only — a stronger assertion in the pipeline cycle test). Reversible.

## Description + Impact
The pipeline's bake re-validates via `ContentPack.parse` (schema treaty); the full integration gate
(integrity + canon + playability) is the `content:verify` script that runs on all on-disk packs (the ship
backstop — sound). But the pipeline's OWN cycle test verified the generated candidate only for schema +
byte-stability + treaty — NOT that it's PLAYABLE. Per the thesis ("AI content can't break the game"), the
generator's output should pass the SAME full gate as hand-authored content. Added a cycle-test assertion:
load the candidate with its base (pack.opening), then run loadPacks (integrity) + staticPlayabilityCheck +
auditCanon — assert zero errors. Verifies the demo pipeline emits playable, canon-consistent content
(offline/deterministic, no model needed).

## DoD + Acceptance
- [x] cycle.test +1: the generated candidate, loaded with pack.opening, passes staticPlayabilityCheck (no
  errors) + auditCanon (consistent). pnpm verify green (317); golden untouched; audit clean.
