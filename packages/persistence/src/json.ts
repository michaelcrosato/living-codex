import type { SaveEnvelope } from "@codex/engine-core";

/** Export a save as plain JSON (sharing, deterministic bug reports — AGENT_GUIDES Recipe 4). */
export function exportSave(save: SaveEnvelope): string {
  return JSON.stringify(save, null, 2);
}

export function importSave(json: string): SaveEnvelope {
  return JSON.parse(json) as SaveEnvelope;
}
