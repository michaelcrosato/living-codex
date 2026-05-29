import { WORLD_VERSION, type World } from "@codex/engine-core";
import { runMigrations, type Migration } from "./runner";

/**
 * World save migrations. Each entry upgrades one version step; the runner chains them to
 * WORLD_VERSION. Add a step (and a fixture test) whenever the World shape changes.
 */
export const worldMigrations: readonly Migration[] = [
  {
    from: 1,
    to: 2,
    // v2 added npcDialogue + unlockedExits (NPC reactions / unlock_exit / set_npc_dialogue).
    migrate: (data) => ({ ...data, npcDialogue: {}, unlockedExits: {}, version: 2 }),
  },
];

export function migrateWorld(data: unknown): World {
  return runMigrations(data, WORLD_VERSION, worldMigrations, "World") as unknown as World;
}
