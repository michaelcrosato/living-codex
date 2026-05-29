import type { Registries } from "@codex/content-loader";
import type { VectorShape } from "@codex/content-schema";
import type { Camera, Renderer, World } from "@codex/engine-core";

/** Camera centered on the player (ARCHITECTURE.md §5 — camera lives in the app, not the engine). */
export function cameraFor(world: World, viewport: { w: number; h: number }, zoom = 1): Camera {
  const player = world.entities[world.player.entityId];
  return { center: player ? player.pos : { x: 0, y: 0 }, zoom, viewport };
}

function drawShape(renderer: Renderer, shape: VectorShape): void {
  switch (shape.kind) {
    case "rect": {
      const { x, y } = shape.at;
      renderer.drawPath(
        [
          { x, y },
          { x: x + shape.w, y },
          { x: x + shape.w, y: y + shape.h },
          { x, y: y + shape.h },
        ],
        { fill: shape.fill, ...(shape.stroke ? { stroke: shape.stroke } : {}) },
      );
      break;
    }
    case "circle":
      renderer.drawCircle(shape.at, shape.r, {
        fill: shape.fill,
        ...(shape.stroke ? { stroke: shape.stroke } : {}),
      });
      break;
    case "path":
      renderer.drawPath(shape.points, { stroke: shape.stroke, ...(shape.fill ? { fill: shape.fill } : {}) });
      break;
  }
}

/**
 * Read `World` + registries and issue draw intents for the current location: its vector art,
 * exit markers, and every co-located entity (player gold, living NPCs cyan, downed grey). The
 * engine stays pure — this is the app reading state and calling the Renderer port.
 */
export function drawScene(
  renderer: Renderer,
  world: World,
  registries: Registries,
  viewport: { w: number; h: number },
): void {
  renderer.begin(cameraFor(world, viewport));
  const location = registries.locations.get(world.locationId);
  if (location) {
    for (const shape of location.art) drawShape(renderer, shape);
    for (const exit of location.exits) renderer.drawCircle(exit.at, 6, { stroke: "#2bd1ff" });
  }
  for (const entity of Object.values(world.entities)) {
    if (entity.locationId !== world.locationId) continue;
    const isPlayer = entity.id === world.player.entityId;
    renderer.drawCircle(entity.pos, isPlayer ? 8 : 7, {
      fill: isPlayer ? "#ffd166" : entity.alive ? "#2bd1ff" : "#555555",
    });
  }
  renderer.end();
}
