# SPEC-53 — Orphaned-dialogue hygiene check (content-safety net extension)

**Wave:** Cycle-7 / C7-P0 (safety/quality tooling). **Risk:** LOW (additive, pure, warning-only — never
blocks the gate). Reversible.

## Description + Impact
SPEC-51 surfaced a real authoring-bug *class*: content can be fully authored, schema-valid, and
integrity-clean yet **unreachable in play** (the kestrel pack was loaded by no one). At the pack level that's
now guarded (`live-packs.spec`). One level down, the same hazard exists for **dialogues**: a `DialogueAsset`
can be defined in a pack but referenced by no NPC, reaction, storylet, or `set_npc_dialogue` effect — dead
content that ships but can never be seen. The loader's referential integrity checks the *reverse* (every
referenced dialogue exists); nothing checks for *orphans*.

This extends `staticPlayabilityCheck` (the tested content-safety layer that already emits the storylet
always-on-noise hygiene warning) with an **orphaned-dialogue warning**: any dialogue in the registry that no
NPC `dialogueId`, `reactsTo.overrideDialogueId`, storylet `content.dialogueId`, or quest `set_npc_dialogue`
effect points at. It is a **warning, not an error** — the check is pure over whatever registries it's given,
and on a subset load a dialogue referenced only by a not-yet-loaded pack would look orphaned; advisory is
the correct severity (matching the salience-0 storylet warning). Run in `content:verify` for all packs, it
extends the repo thesis from "AI-authored content can't *break* the game" to "...can't be silently
*unreachable*." It finds zero orphans today (audited) — its value is as a regression guard for future
hand- and AI-authored content.

## Files (in scope)
- `packages/content-loader/src/playability.ts` (add the orphan-dialogue scan + warning).
- `packages/content-loader/src/playability.test.ts` (planted orphan → warning; clean set → none).

## Out of scope
- Making orphans a hard error (subset-load false positives make that wrong — keep advisory).
- Orphan detection for other entity kinds (NPCs/items/factions can be referenced by `assertions`,
  reactions, future verbs — a broader, separately-justified analysis; this spec is dialogues only).
- The `content-verify.ts` CLI already prints `report.warnings`; no CLI change needed.

## DoD + Acceptance
- [ ] `staticPlayabilityCheck` collects every referenced dialogue id from: `npc.dialogueId`,
      `npc.reactsTo[].overrideDialogueId`, `storylet.content.dialogueId`, and `set_npc_dialogue` effects in
      quest `branches[].onComplete` / `.onFail` / `objectives[].onFail` (skill_check) / `onAnyComplete`.
- [ ] Any `registries.dialogues` id not in that set yields one `warnings` entry naming the dialogue.
- [ ] No `errors` are added (warning-only).
- [ ] `playability.test.ts`: a registry with a planted orphan dialogue produces exactly the orphan warning;
      a clean registry produces none. Existing playability tests stay green.
- [ ] `pnpm content:verify` still prints OK (0 errors) for the real content (it has 0 orphans today).
- [ ] `pnpm verify` green; test count rises. Golden untouched; audit clean.

## Test strategy
Unit-test `staticPlayabilityCheck` directly (the existing `playability.test.ts` pattern): build a minimal
`Registries` with a dialogue referenced by an NPC (no warning) plus a second dialogue referenced by nothing
(expect its orphan warning), and assert `errors` stays empty. A clean-set case asserts no orphan warning.
The real `content:verify` run over all 7 packs is the integration check (must stay 0-error; audited 0-orphan).
