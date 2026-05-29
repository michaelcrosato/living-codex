import { World as Miniplex } from "miniplex";
import type { LocationId, NpcId } from "@codex/content-schema";
import type { World } from "../state/world";
import type { EcsEntity, NpcLookup } from "./components";

/**
 * Build the derived ECS query layer from `World` (ARCHITECTURE.md §3). Rebuilt each time it
 * is needed — it wraps `World` data and is never authoritative. Optionally joins the NPC
 * registry to populate interactive/dialogueRef/faction traits.
 */
export function buildEcs(world: World, npcs?: NpcLookup): Miniplex<EcsEntity> {
  const ecs = new Miniplex<EcsEntity>();
  for (const entity of Object.values(world.entities)) {
    const base: EcsEntity = {
      id: entity.id,
      defId: entity.defId,
      position: { ...entity.pos },
      locationId: entity.locationId,
      alive: entity.alive,
      isPlayer: entity.id === world.player.entityId,
      ...(entity.hp !== undefined ? { hp: entity.hp } : {}),
    };
    const def = npcs?.get(entity.defId as unknown as NpcId);
    if (def) {
      base.interactive = true;
      base.dialogueRef = def.dialogueId;
      if (def.faction) base.faction = def.faction;
    }
    ecs.add(base);
  }
  return ecs;
}

export function playerEntity(ecs: Miniplex<EcsEntity>): EcsEntity | undefined {
  return ecs.entities.find((e) => e.isPlayer);
}

export function entitiesAt(ecs: Miniplex<EcsEntity>, locationId: LocationId): EcsEntity[] {
  return ecs.entities.filter((e) => e.locationId === locationId);
}

/** Interactable NPCs co-located with the player (basis for "talk to" detection, T-06). */
export function interactablesAt(ecs: Miniplex<EcsEntity>, locationId: LocationId): EcsEntity[] {
  return ecs.entities.filter((e) => e.interactive === true && !e.isPlayer && e.locationId === locationId);
}

/** Living combatants (entities with hp), the basis for the `defeat` objective (T-09). */
export function combatants(ecs: Miniplex<EcsEntity>): EcsEntity[] {
  return [...ecs.with("hp")].filter((e) => e.alive);
}
