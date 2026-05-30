# SPEC-100 — Extract + unit-test the world→screen camera transform

**Wave:** Cycle-9 / C9-P1 (testability of vendor-glue's pure logic). **Risk:** LOW (behavior-preserving
extraction; e2e confirms the live render). Reversible.

## Description + Impact
`renderer.begin` computed the world→screen transform inline (scale = zoom; offset = viewport/2 − center*zoom),
tangled with Pixi `worldLayer` mutation — so this genuine coordinate logic was only e2e-covered. Extracted it
to a pure, **Pixi-free** `cameraTransform(camera) → {scale,x,y}` (render-pixi/src/camera.ts), used by
renderer.begin, and unit-tested it (render-pixi's first unit test — of its only non-Pixi logic, vendor
isolation preserved). Pins the centering + zoom math.

## DoD + Acceptance
- [x] `cameraTransform` pure (no Pixi); renderer.begin uses it (behavior unchanged — e2e green). camera.test
  +3 (centering, origin, zoom). pnpm verify EXIT 0 (329); build + e2e EXIT 0; golden untouched; audit clean.
