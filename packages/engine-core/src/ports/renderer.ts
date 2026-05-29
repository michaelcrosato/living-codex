/**
 * The Renderer port (ARCHITECTURE.md §5). Defined in the pure core; render-pixi implements it.
 * The engine never calls these — the app reads `World` + registries each frame and issues draw
 * intents. Vector now (Graphics); `drawSprite` is a no-op until the future sprite/AI-art layer,
 * which will be a NEW package implementing this same interface with one import change in app-web.
 * Pixi types never cross this boundary — only plain Vec2/style data.
 */
export interface Vec2 {
  x: number;
  y: number;
}

export interface Camera {
  center: Vec2;
  zoom: number;
  viewport: { w: number; h: number };
}

/** Fill and/or stroke for a vector shape (maps directly onto content-schema VectorShape). */
export interface ShapeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface TextStyle {
  color: string;
  size: number;
  font?: string;
}

export interface Renderer {
  begin(camera: Camera): void;
  drawPath(points: readonly Vec2[], style: ShapeStyle): void;
  drawCircle(center: Vec2, radius: number, style: ShapeStyle): void;
  drawText(pos: Vec2, text: string, style: TextStyle): void;
  /** No-op until sprites exist (GOAL.md §3.6). */
  drawSprite(id: string, pos: Vec2): void;
  end(): void;
}
