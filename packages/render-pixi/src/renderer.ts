import { Application, Container, Graphics, Text } from "pixi.js";
import type { Camera, Renderer, ShapeStyle, TextStyle, Vec2 } from "@codex/engine-core";

/**
 * The ONLY package that imports pixi.js (vendor isolation, AGENTS.md). Implements engine-core's
 * Renderer port with PixiJS 8 `Graphics` (vectors). Pixi types never escape this file — the app
 * sees only the port. To move to sprites/AI-art later, add a new render-* package implementing
 * the same Renderer and change one import in app-web (GOAL.md §3.6).
 */
function paint(gfx: Graphics, style: ShapeStyle): void {
  if (style.fill !== undefined) gfx.fill({ color: style.fill });
  if (style.stroke !== undefined) gfx.stroke({ color: style.stroke, width: style.strokeWidth ?? 1 });
}

export class PixiRenderer implements Renderer {
  private readonly gfx = new Graphics();
  private readonly textLayer = new Container();

  constructor(
    private readonly app: Application,
    private readonly worldLayer: Container,
  ) {
    this.worldLayer.addChild(this.gfx);
    this.worldLayer.addChild(this.textLayer);
  }

  begin(camera: Camera): void {
    this.gfx.clear();
    this.textLayer.removeChildren();
    this.worldLayer.scale.set(camera.zoom);
    this.worldLayer.position.set(
      camera.viewport.w / 2 - camera.center.x * camera.zoom,
      camera.viewport.h / 2 - camera.center.y * camera.zoom,
    );
  }

  drawPath(points: readonly Vec2[], style: ShapeStyle): void {
    if (points.length < 2) return;
    this.gfx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) this.gfx.lineTo(points[i]!.x, points[i]!.y);
    if (style.fill !== undefined) this.gfx.closePath();
    paint(this.gfx, style);
  }

  drawCircle(center: Vec2, radius: number, style: ShapeStyle): void {
    this.gfx.circle(center.x, center.y, radius);
    paint(this.gfx, style);
  }

  drawText(pos: Vec2, text: string, style: TextStyle): void {
    const label = new Text({
      text,
      style: { fill: style.color, fontSize: style.size, fontFamily: style.font ?? "monospace" },
    });
    label.position.set(pos.x, pos.y);
    this.textLayer.addChild(label);
  }

  drawSprite(_id: string, _pos: Vec2): void {
    // no-op until the sprite/AI-art layer exists (GOAL.md §3.6)
  }

  end(): void {
    this.app.render();
  }
}

export interface CreatePixiRendererOptions {
  width: number;
  height: number;
  background?: string;
  canvas?: HTMLCanvasElement;
}

/** Create a Pixi Application and a Renderer bound to a world-space layer. */
export async function createPixiRenderer(
  opts: CreatePixiRendererOptions,
): Promise<{ app: Application; renderer: PixiRenderer }> {
  const app = new Application();
  await app.init({
    width: opts.width,
    height: opts.height,
    background: opts.background ?? "#0b0e14",
    antialias: true,
    ...(opts.canvas ? { canvas: opts.canvas } : {}),
  });
  const worldLayer = new Container();
  app.stage.addChild(worldLayer);
  return { app, renderer: new PixiRenderer(app, worldLayer) };
}
