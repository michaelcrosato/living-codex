import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { LocationId } from "@codex/content-schema";
import {
  createWorld,
  type Camera,
  type Renderer,
  type ShapeStyle,
  type TextStyle,
  type Vec2,
} from "@codex/engine-core";
import { cameraFor, drawScene } from "../src/scene";

const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const { registries } = loadPacks([raw]);
const DISTRICT = LocationId.parse("location.ashfall_district");

/** A headless Renderer that records the draw intents (no WebGL needed). */
class FakeRenderer implements Renderer {
  readonly calls: string[] = [];
  begin(c: Camera): void {
    this.calls.push(`begin@${c.center.x},${c.center.y}`);
  }
  drawPath(points: readonly Vec2[], _style: ShapeStyle): void {
    this.calls.push(`path:${points.length}`);
  }
  drawCircle(_center: Vec2, radius: number, _style: ShapeStyle): void {
    this.calls.push(`circle:${radius}`);
  }
  drawText(_pos: Vec2, text: string, _style: TextStyle): void {
    this.calls.push(`text:${text}`);
  }
  drawSprite(): void {
    this.calls.push("sprite");
  }
  end(): void {
    this.calls.push("end");
  }
}

describe("scene drawing", () => {
  it("centers the camera on the player", () => {
    const world = createWorld({ seed: "s", startLocationId: DISTRICT, startPos: { x: 50, y: 60 } });
    expect(cameraFor(world, { w: 800, h: 600 }).center).toEqual({ x: 50, y: 60 });
  });

  it("draws the location art and the player, bracketed by begin/end", () => {
    const world = createWorld({ seed: "s", startLocationId: DISTRICT, startPos: { x: 50, y: 50 } });
    const r = new FakeRenderer();
    drawScene(r, world, registries, { w: 800, h: 600 });

    expect(r.calls[0]).toMatch(/^begin@/);
    expect(r.calls.at(-1)).toBe("end");
    // ashfall_district has 2 rect art shapes -> 2 path calls; the player -> a circle
    expect(r.calls.filter((c) => c.startsWith("path:")).length).toBeGreaterThanOrEqual(2);
    expect(r.calls.some((c) => c.startsWith("circle:8"))).toBe(true); // the player marker
  });
});
