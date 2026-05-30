import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { LocationId, NpcId } from "@codex/content-schema";
import {
  createWorld,
  applyEvent,
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
  readonly circleFills: (string | undefined)[] = [];
  readonly circleStrokes: (string | undefined)[] = [];
  drawCircle(_center: Vec2, radius: number, style: ShapeStyle): void {
    this.calls.push(`circle:${radius}`);
    this.circleFills.push(style.fill);
    this.circleStrokes.push(style.stroke);
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

  // SPEC-74 — a living NPC is drawn with its authored appearance (bodyColor fill + accentColor ring).
  it("colors a co-located NPC by its authored appearance", () => {
    let world = createWorld({ seed: "s", startLocationId: DISTRICT, startPos: { x: 50, y: 50 } });
    world = applyEvent(world, {
      type: "SpawnEntity",
      entity: { id: "entity.npc.varga", defId: "npc.varga", locationId: DISTRICT, pos: { x: 100, y: 100 }, alive: true },
    });
    const varga = registries.npcs.get(NpcId.parse("npc.varga"))!;
    const r = new FakeRenderer();
    drawScene(r, world, registries, { w: 800, h: 600 });
    expect(r.circleFills).toContain(varga.appearance.bodyColor); // not the generic #2bd1ff
    expect(r.circleStrokes).toContain(varga.appearance.accentColor);
  });

  it("draws a downed NPC grey (no appearance), not its bodyColor", () => {
    let world = createWorld({ seed: "s", startLocationId: DISTRICT, startPos: { x: 50, y: 50 } });
    world = applyEvent(world, {
      type: "SpawnEntity",
      entity: { id: "entity.npc.varga", defId: "npc.varga", locationId: DISTRICT, pos: { x: 100, y: 100 }, alive: false },
    });
    const r = new FakeRenderer();
    drawScene(r, world, registries, { w: 800, h: 600 });
    expect(r.circleFills).toContain("#555555"); // downed grey
    // WCAG 1.4.1 (SPEC-85): downed entities also get a non-color size cue (smaller radius), not color alone.
    expect(r.calls).toContain("circle:4"); // downed radius
    expect(r.calls).not.toContain("circle:7"); // ...distinct from a living NPC (7)
  });
});
