/**
 * A tiny versioned-migration runner (WORLD_STATE.md §7, SCHEMA.md §10). Offline tooling: it
 * upgrades a saved World / ReplayLog / ContentPack from whatever version it was written at to
 * the current one by applying ordered step migrations. Each step must advance the version; a
 * missing step or a too-new input fails loudly rather than silently mis-loading.
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
    throw new Error(`${label}: data is version ${version}, newer than this tool supports (${target})`);
  }
  return data;
}
