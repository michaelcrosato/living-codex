import type { LocationId, NpcId, FactionId, DialogueId } from "@codex/content-schema";
import type { EntityId } from "../state/world";

/**
 * The ECS entity shape (ARCHITECTURE.md §3). This is a DERIVED query layer over `World`
 * (WORLD_STATE.md §6), never the source of truth. Runtime fields come from `World.entities`;
 * the static traits (interactive, dialogueRef, faction) are an optional *join* with the NPC
 * registry — content-schema types only, so engine-core stays pure. No system mutates these;
 * systems emit events that fold into `World`, and the ECS is rebuilt from the new `World`.
 */
export interface EcsEntity {
  id: EntityId;
  defId: string;
  position: { x: number; y: number };
  locationId: LocationId;
  alive: boolean;
  isPlayer: boolean;
  hp?: number;
  // derived-by-join (present only when a known NPC definition was supplied):
  interactive?: boolean;
  dialogueRef?: DialogueId;
  faction?: FactionId;
}

/** A minimal NPC lookup (a ReadonlyMap<NpcId, Npc> satisfies this) used to enrich the ECS. */
export interface NpcLookup {
  get(id: NpcId): { dialogueId: DialogueId; faction?: FactionId } | undefined;
}
