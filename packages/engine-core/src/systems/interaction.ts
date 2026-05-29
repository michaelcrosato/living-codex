import type { Location, LocationId } from "@codex/content-schema";
import type { System } from "../tick";
import type { GameEvent, InputEvent } from "../events/event";
import type { NpcLookup } from "../ecs/components";
import { buildEcs, interactablesAt } from "../ecs/registry";
import { evaluateAll } from "../conditions/conditions";

/** "Talk to" and "use exit" detection (T-06). */
export const INTERACT_RADIUS = 32;
export const EXIT_RADIUS = 40;

export interface InteractionContext {
  locations: ReadonlyMap<LocationId, Location>;
  npcs?: NpcLookup;
}

function distanceSquared(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Input-driven system factory. On `Interact`, emits an `Interacted` event for the nearest
 * interactable NPC within range. On `UseExit`, emits `EnterLocation` if the player is near
 * the exit AND its `requires` conditions hold (the gate); otherwise a `ShowText` "barred".
 * Exit gating is exactly an `evaluateAll` over the exit's conditions (SCHEMA.md §2, §7).
 */
export function interactionSystem(inputs: readonly InputEvent[], ctx: InteractionContext): System {
  return (world) => {
    const player = world.entities[world.player.entityId];
    if (!player) return [];
    const events: GameEvent[] = [];
    const location = ctx.locations.get(world.locationId);

    for (const input of inputs) {
      if (input.type === "Interact") {
        const ecs = buildEcs(world, ctx.npcs);
        const nearest = interactablesAt(ecs, world.locationId)
          .filter((e) => distanceSquared(e.position, player.pos) <= INTERACT_RADIUS * INTERACT_RADIUS)
          .sort(
            (a, b) =>
              distanceSquared(a.position, player.pos) - distanceSquared(b.position, player.pos),
          )[0];
        if (nearest) {
          events.push({
            type: "Interacted",
            entityId: nearest.id,
            ...(nearest.dialogueRef ? { dialogueId: nearest.dialogueRef } : {}),
          });
        }
      } else if (input.type === "UseExit") {
        if (!location) continue;
        const exit = location.exits[input.exitIndex];
        if (!exit) continue;
        if (distanceSquared(exit.at, player.pos) > EXIT_RADIUS * EXIT_RADIUS) continue;
        // The unlock_exit effect force-opens an exit regardless of its `requires` gate.
        const unlocked = world.unlockedExits[`${world.locationId}#${input.exitIndex}`] === true;
        if (unlocked || evaluateAll(world, exit.requires)) {
          events.push({ type: "EnterLocation", locationId: exit.toLocationId, spawnAt: exit.spawnAt });
        } else {
          events.push({ type: "ShowText", text: `The way to ${exit.label} is barred.` });
        }
      }
    }
    return events;
  };
}
