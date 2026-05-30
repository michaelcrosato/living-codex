import { describe, it, expect } from "vitest";
import type { Camera } from "@codex/engine-core";
import { cameraTransform } from "./camera";

/**
 * SPEC-100 — the world→screen camera transform (extracted from renderer.begin) is pure + unit-tested,
 * without importing pixi.js. Pins the centering math + zoom scaling that were previously only e2e-covered.
 */
const cam = (center: { x: number; y: number }, zoom: number, w = 800, h = 600): Camera => ({
  center,
  zoom,
  viewport: { w, h },
});

describe("cameraTransform (SPEC-100)", () => {
  it("centers the camera target in the viewport at zoom 1", () => {
    expect(cameraTransform(cam({ x: 100, y: 50 }, 1))).toEqual({ scale: 1, x: 400 - 100, y: 300 - 50 });
  });

  it("a centered target at the origin offsets to the viewport center", () => {
    expect(cameraTransform(cam({ x: 0, y: 0 }, 1))).toEqual({ scale: 1, x: 400, y: 300 });
  });

  it("scales by zoom and offsets by center*zoom", () => {
    expect(cameraTransform(cam({ x: 100, y: 100 }, 2))).toEqual({ scale: 2, x: 400 - 200, y: 300 - 200 });
  });
});
