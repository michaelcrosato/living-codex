import type { Camera } from "@codex/engine-core";

/**
 * The pure world→screen transform for the Pixi worldLayer: scale by the camera zoom and offset so the
 * camera's center sits at the viewport center. Extracted from `renderer.begin` (SPEC-100) so this coordinate
 * logic is unit-testable WITHOUT importing pixi.js — vendor isolation preserved (this file has no Pixi).
 */
export function cameraTransform(camera: Camera): { scale: number; x: number; y: number } {
  return {
    scale: camera.zoom,
    x: camera.viewport.w / 2 - camera.center.x * camera.zoom,
    y: camera.viewport.h / 2 - camera.center.y * camera.zoom,
  };
}
