# SPEC-71 — Surface authored location `ambientText` in the HUD

**Wave:** Cycle-8 / C8-P0 (UX — display authored-but-unsurfaced content). **Risk:** LOW (additive HUD line;
pure read of World+registries; no engine/schema/content change). Reversible.

## Description + Impact
The SPEC-70 audit found a real gap: 6 of 8 locations carry authored `ambientText` (e.g. `ashfall_district`
"A drone coughs past overhead.") but it is referenced ONLY in content-schema — nothing in app-web/render/scene
displays it, so players never see the authored atmosphere. This surfaces it in the text HUD (like SPEC-24
barks / SPEC-56 consequences): the current location's ambient line is shown, **deterministically** rotating
slowly so it doesn't flicker per-frame. Pure presentation; no World/replay impact (the HUD is a derived view).

## Files (in scope)
- `packages/app-web/src/hud.ts` (one ambient line in `renderHud`).
- `packages/app-web/test/hud.spec.ts` (assert it renders the current location's ambientText; absent when none).

## Out of scope
- Any engine/schema/content change. Showing ambient in the Pixi scene (HUD text is the established surface).
- Random per-frame rotation (must be deterministic + stable to avoid flicker).

## Design
In `renderHud`, after the location-name line, if the current location has `ambientText.length > 0`, push
`~ ${ambientText[Math.floor(world.tick / 600) % ambientText.length]}` — a stable slow rotation (one line per
~10s at 60fps; at `tick 0` it's `ambientText[0]`, so it's trivially testable). No-op when `ambientText` is empty.

## DoD + Acceptance
- [ ] `renderHud` shows the current location's ambient line (the `~ ` prefix) when present; nothing when empty.
- [ ] `hud.spec.ts`: a registry whose current location has `ambientText: ["X"]` → HUD contains `X`; a location
      with `ambientText: []` → no `~ ` line. Existing HUD cases stay green.
- [ ] `pnpm verify` green; production build green; `pnpm e2e` 4 passed (the cold-open slice still passes — the
      district's ambient line is additive and the assertions are substring-based). Golden untouched; audit clean.

## Test strategy
Extend `hud.spec.ts` (SPEC-56 pattern): build a minimal `Registries` with one `location.start` carrying
`ambientText`, render with a `createWorld`-seeded world (tick 0 → ambientText[0]), assert the line is present;
a second location with empty ambientText asserts absence.
