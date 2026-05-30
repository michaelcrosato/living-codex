import { WORLD_VERSION, type World } from "./world";

/**
 * Versioned save migration (WORLD_STATE.md §7, SCHEMA.md §10). This lives in engine-core — not
 * the offline tools/ — because the engine owns `World` + `WORLD_VERSION` and must upgrade an
 * older save AT RUNTIME (a shipped package may not import tools/, by the dependency rule). Pure
 * and total: a missing step or a too-new input fails loudly rather than silently mis-loading.
 * `tools/migrate` re-exports these so the offline tooling shares one source of truth.
 */
export interface Migration {
  readonly from: number;
  readonly to: number;
  migrate(data: Record<string, unknown>): Record<string, unknown>;
}

function versionOf(data: Record<string, unknown>): number {
  const v = data.version;
  return typeof v === "number" ? v : 0;
}

/** Apply ordered step-migrations to upgrade `input` from its `version` to `target`. */
export function runMigrations(
  input: unknown,
  target: number,
  steps: readonly Migration[],
  label: string,
): Record<string, unknown> {
  if (typeof input !== "object" || input === null) {
    throw new Error(`${label}: expected an object to migrate, got ${typeof input}`);
  }
  let data = input as Record<string, unknown>;
  let version = versionOf(data);
  while (version < target) {
    const step = steps.find((s) => s.from === version);
    if (!step) throw new Error(`${label}: no migration from version ${version} toward ${target}`);
    data = step.migrate(data);
    const next = versionOf(data);
    if (next <= version) {
      throw new Error(`${label}: migration ${step.from}->${step.to} did not advance the version`);
    }
    version = next;
  }
  if (version > target) {
    throw new Error(
      `${label}: data is version ${version}, newer than this build supports (${target})`,
    );
  }
  return data;
}

/** World save migrations — one entry per version step; the runner chains them to WORLD_VERSION. */
export const worldMigrations: readonly Migration[] = [
  {
    from: 1,
    to: 2,
    // v2 added npcDialogue + unlockedExits (NPC reactions / unlock_exit / set_npc_dialogue).
    migrate: (data) => ({ ...data, npcDialogue: {}, unlockedExits: {}, version: 2 }),
  },
];

/** Upgrade a (possibly older) serialized World to the current WORLD_VERSION. Pure. */
export function migrateWorld(data: unknown): World {
  return runMigrations(data, WORLD_VERSION, worldMigrations, "World") as unknown as World;
}
