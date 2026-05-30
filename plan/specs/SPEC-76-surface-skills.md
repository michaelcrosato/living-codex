# SPEC-76 — Surface the player's skill sheet in the HUD

**Wave:** Cycle-8 / C8-P1 (UX — display decision-relevant player state). **Risk:** LOW (HUD line; pure read).
Reversible.

## Description + Impact
Quest branch choices gate on `skill_check` vs the player's skills (persuade/sneak/force/tech), but the skills
were never displayed — the player couldn't see the numbers their choices depend on. `renderHud` now shows the
skill sheet (`⚔ persuade N · sneak N · force N · tech N`). Pure derived-view; no engine impact. 4th
unsurfaced-content fix this cycle (ambientText 71, NPC colors 74, quest summary 75, skills 76).

## DoD + Acceptance
- [x] `renderHud` shows `⚔ ` + each `world.player.skills` entry (`name value`, joined by ` · `).
- [x] `hud.spec` +1 (skills present). `pnpm verify` green (297); build + e2e 4 passed; golden untouched; audit clean.
