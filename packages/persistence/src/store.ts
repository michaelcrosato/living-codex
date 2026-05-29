import { createStore, del, get, keys, set } from "idb-keyval";
import { migrateWorld, type SaveEnvelope } from "@codex/engine-core";

/**
 * Browser-native save/load over IndexedDB (idb-keyval). A save is a `SaveEnvelope`
 * (snapshot + logSinceSnapshot + contentFingerprint, WORLD_STATE.md §7), so loading restores
 * the snapshot and replays only the tail. The whole envelope is JSON-serializable, so it also
 * exports/imports as plain JSON (see json.ts) for sharing and deterministic bug reports.
 */
const SAVE_STORE = createStore("living-codex", "saves");

/** Thrown when a save can't be persisted because the origin's storage quota is exhausted. */
export class SaveQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveQuotaError";
  }
}

export async function saveGame(slot: string, save: SaveEnvelope): Promise<void> {
  try {
    await set(slot, save, SAVE_STORE);
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      throw new SaveQuotaError(`Save failed: storage quota exceeded (slot "${slot}").`);
    }
    throw err;
  }
}

export async function loadGame(slot: string): Promise<SaveEnvelope | undefined> {
  const save = await get<SaveEnvelope>(slot, SAVE_STORE);
  if (!save) return undefined;
  // Forward-migrate the snapshot's World so a save written by an older build still loads
  // (WORLD_STATE.md §7 rule 3). migrateWorld is a no-op on current-version saves.
  return { ...save, world: migrateWorld(save.world) };
}

/**
 * Best-effort request to make this origin's storage PERSISTENT (exempt from automatic eviction;
 * otherwise saves can be cleared under disk pressure, and Safari wipes them after ~7 days of no
 * use). Feature-detected — resolves false where the Storage API is unavailable; never throws.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  if (navigator.storage.persisted && (await navigator.storage.persisted())) return true;
  return navigator.storage.persist();
}

/** Best-effort storage usage/quota estimate (bytes), or null if the Storage API is unavailable. */
export async function estimateStorage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const est = await navigator.storage.estimate();
  return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
}

export async function deleteGame(slot: string): Promise<void> {
  await del(slot, SAVE_STORE);
}

export async function listSlots(): Promise<string[]> {
  return (await keys(SAVE_STORE)).map(String);
}
