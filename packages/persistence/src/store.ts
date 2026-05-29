import { createStore, del, get, keys, set } from "idb-keyval";
import type { SaveEnvelope } from "@codex/engine-core";

/**
 * Browser-native save/load over IndexedDB (idb-keyval). A save is a `SaveEnvelope`
 * (snapshot + logSinceSnapshot + contentFingerprint, WORLD_STATE.md §7), so loading restores
 * the snapshot and replays only the tail. The whole envelope is JSON-serializable, so it also
 * exports/imports as plain JSON (see json.ts) for sharing and deterministic bug reports.
 */
const SAVE_STORE = createStore("living-codex", "saves");

export async function saveGame(slot: string, save: SaveEnvelope): Promise<void> {
  await set(slot, save, SAVE_STORE);
}

export async function loadGame(slot: string): Promise<SaveEnvelope | undefined> {
  return get<SaveEnvelope>(slot, SAVE_STORE);
}

export async function deleteGame(slot: string): Promise<void> {
  await del(slot, SAVE_STORE);
}

export async function listSlots(): Promise<string[]> {
  return (await keys(SAVE_STORE)).map(String);
}
