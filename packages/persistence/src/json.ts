import { migrateWorld, type SaveEnvelope } from "@codex/engine-core";

/** Export a save as plain JSON (sharing, deterministic bug reports — AGENT_GUIDES Recipe 4). */
export function exportSave(save: SaveEnvelope): string {
  return JSON.stringify(save, null, 2);
}

export function importSave(json: string): SaveEnvelope {
  const save = JSON.parse(json) as SaveEnvelope;
  // Forward-migrate the snapshot's World so a file exported by an older build still imports
  // (symmetric with loadGame in store.ts; WORLD_STATE §7). migrateWorld is a no-op at the
  // current version. Without this, an old (v1) save imports with the v2 maps missing and the
  // next session.step throws in reactionsSystem (SPEC-120).
  return { ...save, world: migrateWorld(save.world) };
}
