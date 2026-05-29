import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { LocationId, FlagId, type ContentFingerprint } from "@codex/content-schema";
import {
  createWorld,
  applyEvents,
  makeSave,
  loadSave,
  hash,
  WORLD_VERSION,
  type ReplayEntry,
  type SaveEnvelope,
} from "@codex/engine-core";
import {
  saveGame,
  loadGame,
  listSlots,
  deleteGame,
  requestPersistentStorage,
  estimateStorage,
} from "./store";
import { exportSave, importSave } from "./json";

const START = LocationId.parse("location.start");
const FA = FlagId.parse("flag.a");
const FB = FlagId.parse("flag.b");
const FP: ContentFingerprint = { packs: {}, registriesHash: "x" };

/** A save whose snapshot is mid-game and whose tail must be replayed to reach `fullHash`. */
function build(): { save: SaveEnvelope; fullHash: string } {
  const initial = createWorld({ seed: "s", startLocationId: START });
  const snapshot = applyEvents(initial, [{ type: "SetFlag", flag: FA, to: true }]);
  const tail: ReplayEntry[] = [
    { tick: 1, kind: "event", event: { type: "SetFlag", flag: FB, to: 5 } },
  ];
  const full = applyEvents(snapshot, [{ type: "SetFlag", flag: FB, to: 5 }]);
  return { save: makeSave(snapshot, tail, FP), fullHash: hash(full) };
}

describe("persistence (IndexedDB save/load)", () => {
  it("saves and loads a SaveEnvelope; loading replays the tail to the full state", async () => {
    const { save, fullHash } = build();
    await saveGame("slot1", save);
    const loaded = await loadGame("slot1");
    expect(loaded).toBeDefined();
    expect(hash(loadSave(loaded!))).toBe(fullHash);
  });

  it("lists and deletes slots", async () => {
    const { save } = build();
    await saveGame("slotA", save);
    await saveGame("slotB", save);
    expect((await listSlots()).sort()).toEqual(expect.arrayContaining(["slotA", "slotB"]));
    await deleteGame("slotA");
    expect(await listSlots()).not.toContain("slotA");
  });

  it("exports/imports as JSON and still replays to the same state", () => {
    const { save, fullHash } = build();
    const round = importSave(exportSave(save));
    expect(hash(loadSave(round))).toBe(fullHash);
  });

  it("forward-migrates an older-version World on load (SPEC-10)", async () => {
    // a v1 snapshot (pre-npcDialogue/unlockedExits), as an older build would have written it
    const v1World = {
      version: 1,
      seed: "s",
      rngState: "[1,2,3,4]",
      tick: 3,
      player: {
        entityId: "entity.player",
        skills: { persuade: 1, sneak: 0, force: 0, tech: 0 },
        conditionMods: { persuade: 0, sneak: 0, force: 0, tech: 0 },
      },
      locationId: "location.start",
      entities: {},
      flags: { "flag.a": true },
      inventory: {},
      reputation: {},
      quests: {},
      dialogue: {},
    };
    const v1Save = {
      saveVersion: 1,
      engineVersion: "0.1.0",
      contentFingerprint: FP,
      world: v1World,
      logSinceSnapshot: [],
    } as unknown as SaveEnvelope;

    await saveGame("old", v1Save);
    const loaded = await loadGame("old");
    expect(loaded!.world.version).toBe(WORLD_VERSION);
    expect(loaded!.world.npcDialogue).toEqual({});
    expect(loaded!.world.unlockedExits).toEqual({});
    expect(loaded!.world.flags["flag.a" as never]).toBe(true);
  });

  it("storage durability helpers are safe no-ops when the Storage API is unavailable", async () => {
    expect(await requestPersistentStorage()).toBe(false);
    expect(await estimateStorage()).toBeNull();
  });
});
