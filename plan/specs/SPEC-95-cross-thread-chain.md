# SPEC-95 — Cross-thread integration test (warehouse → drive → Syndicate)

**Wave:** Cycle-9 / C9-P1 (integration coverage). **Risk:** LOW (test-only). Reversible.

## Description + Impact
Per-spec tests verify each quest in ISOLATION (seeding flags). Nothing drove the actual CHAIN through the real
engine. This adds a cross-thread integration test: meet Varga → complete the warehouse talk branch (by REACHING
locations + passing the persuade check, via the real questSystem) → that grants the drive (flag.has_drive,
not seeded) → which makes the Syndicate offer chains (offerWhen flag.has_drive) → sell → sold_drive +
reputation. Catches integration breaks BETWEEN threads (e.g. a warehouse onAnyComplete flag failing to gate
the syndicate offer) that isolated per-quest tests can't.

## DoD + Acceptance
- [x] `cross-thread-chain.spec.ts`: a `driveBranch` helper satisfies each objective (reach→EnterLocation,
  talk_to→DialogueAdvanced, skill_check→Attempt) through the real questSystem; drives warehouse.talk to
  completion → asserts has_drive + drive granted (not seeded) → asserts the syndicate offer chains → drives
  syndicate.sell → asserts sold_drive + rep. pnpm verify green (316); golden untouched; audit clean.
