import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { LocationId, FlagId, type ContentFingerprint } from "@codex/content-schema";
import {
  createWorld,
  applyEvents,
  makeSave,
  loadSave,
  hash,
  type ReplayEntry,
  type SaveEnvelope,
} from "@codex/engine-core";
import { saveGame, loadGame, listSlots, deleteGame } from "./store";
import { exportSave, importSave } from "./json";

const START = LocationId.parse("location.start");
const FA = FlagId.parse("flag.a");
const FB = FlagId.parse("flag.b");
const FP: ContentFingerprint = { packs: {}, registriesHash: "x" };

/** A save whose snapshot is mid-game and whose tail must be replayed to reach `fullHash`. */
function build(): { save: SaveEnvelope; fullHash: string } {
  const initial = createWorld({ seed: "s", startLocationId: START });
  const snapshot = applyEvents(initial, [{ type: "SetFlag", flag: FA, to: true }]);
  const tail: ReplayEntry[] = [{ tick: 1, kind: "event", event: { type: "SetFlag", flag: FB, to: 5 } }];
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
});
