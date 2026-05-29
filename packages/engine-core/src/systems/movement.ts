import type { System } from "../tick";
import type { GameEvent, InputEvent } from "../events/event";

/** Top-down player movement (T-06). Deterministic: position advances by dir·speed·dt. */
export const PLAYER_SPEED = 200; // world units per second

/**
 * Input-driven system factory: captures this tick's inputs and returns a pure
 * `(world, dt) => GameEvent[]`. Summed Move inputs translate the player entity; no input
 * (or a zero vector) emits nothing.
 */
export function movementSystem(inputs: readonly InputEvent[], speed = PLAYER_SPEED): System {
  return (world, dt) => {
    const player = world.entities[world.player.entityId];
    if (!player) return [];

    let dx = 0;
    let dy = 0;
    for (const input of inputs) {
      if (input.type === "Move") {
        dx += input.dir.x;
        dy += input.dir.y;
      }
    }
    if (dx === 0 && dy === 0) return [];

    const to = { x: player.pos.x + dx * speed * dt, y: player.pos.y + dy * speed * dt };
    const event: GameEvent = { type: "MoveEntity", entityId: player.id, to };
    return [event];
  };
}
