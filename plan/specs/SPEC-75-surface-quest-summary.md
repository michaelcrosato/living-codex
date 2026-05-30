# SPEC-75 — Surface the active quest's summary in the HUD

**Wave:** Cycle-8 / C8-P1 (UX — display authored player-facing content). **Risk:** LOW (HUD line; pure read).
Reversible.

## Description + Impact
`quest.summary` (the player-facing "what is this quest about" text, authored for every quest) was unsurfaced —
the HUD showed only `✦ title: status`. Now an ACTIVE quest also shows its summary (indented), so the player
knows what to do. Bounded (only active quests). Pure derived-view; no engine impact. Third unsurfaced-content
finding resolved this cycle (after ambientText SPEC-71, NPC colors SPEC-74).

## DoD + Acceptance
- [x] `renderHud` prints `   ${quest.summary}` under a quest line iff `status === "active"`.
- [x] `hud.spec` +2 (active → summary shown; unoffered → not). `pnpm verify` green (296); build + e2e 4 passed
  (cold-open slice unaffected — additive, substring assertions); golden untouched; audit clean.
