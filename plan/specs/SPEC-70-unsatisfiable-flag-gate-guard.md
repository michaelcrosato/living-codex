# SPEC-70 — Playability guard: unsatisfiable flag gate (read but never set)

**Wave:** Cycle-7 / C7-P0 (safety tooling — completes the playability-gate guard suite). **Risk:** LOW
(additive, pure, warning-only). Reversible.

## Description + Impact
A flag-wiring audit found every gated flag is set by something today — but nothing GUARDED it. Every flag in
this engine is content-driven (set only by `set_flag` effects, `reactsTo.setsFlags`, or an Ink `declaredVars`
name mirrored to `flag.<var>` by dialogue.ts). So a flag READ in a `flag_is` gate (offerWhen / storylet
precondition / reactsTo when / exit requires) but SET by nothing can never become true — the content behind
that gate can never trigger (a real "schema-valid ≠ playable" class, like the let_it_go/orphan/unspawnable
cases). `staticPlayabilityCheck` now warns on it. Sound with no false-positive risk (flags are entirely
content-driven — no engine-intrinsic flags); advisory severity (a subset load could set the flag in another
pack), matching the other playability warnings. 4th guard in the suite (orphan-dialogue SPEC-53,
unspawnable-NPC SPEC-60, branch-shadowing SPEC-68, + this).

## Files
- `packages/content-loader/src/playability.ts` (collect set vs read flags; warn on read-not-set).
- `packages/content-loader/src/playability.test.ts` (+3 cases).

## DoD + Acceptance
- [x] Warns on a `flag_is` gate whose flag no effect/`setsFlags`/`declaredVar` sets; no errors added.
- [x] Tests: never-set flag → warn; set via set_flag effect → none; set via Ink declaredVar → none.
- [x] `content:verify` 0-error + **0 flag-gate warnings** on the real 8 packs (audit-confirmed clean).
- [x] `pnpm verify` green (285 tests); golden untouched; audit clean.
