import type { System } from "../tick";
import type { GameEvent, InputEvent } from "../events/event";

/**
 * Minimal combat (T-09): just enough to satisfy a `defeat` objective deterministically. On an
 * Attack input, the player strikes the first living combatant (an entity with hp) co-located
 * with them; damage is rolled by the single RNG inside applyEvent (ResolveAttack), so it is
 * replay-stable. Intentionally shallow — a later ticket may deepen it behind this signature.
 */
export function combatSystem(inputs: readonly InputEvent[]): System {
  return (world) => {
    const player = world.entities[world.player.entityId];
    if (!player) return [];
    const events: GameEvent[] = [];
    for (const input of inputs) {
      if (input.type !== "Attack") continue;
      const target = Object.values(world.entities).find(
        (e) =>
          e.id !== player.id && e.locationId === player.locationId && e.alive && e.hp !== undefined,
      );
      if (target) {
        events.push({
          type: "ResolveAttack",
          attackerEntityId: player.id,
          targetEntityId: target.id,
        });
      }
    }
    return events;
  };
}
