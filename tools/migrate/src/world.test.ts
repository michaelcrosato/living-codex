import { describe, it, expect } from "vitest";
import { WORLD_VERSION } from "@codex/engine-core";
import { migrateWorld } from "./world";

/** A hand-crafted v1 save (pre-npcDialogue/unlockedExits) — the prior-version fixture. */
const v1Save = {
  version: 1,
  seed: "ashfall",
  rngState: "[1,2,3,4]",
  tick: 7,
  player: {
    entityId: "entity.player",
    skills: { persuade: 2, sneak: 1, force: 3, tech: 0 },
    conditionMods: { persuade: 0, sneak: 0, force: 0, tech: 0 },
  },
  locationId: "location.ashfall_district",
  entities: {},
  flags: { "flag.met_varga": true },
  inventory: { "item.credits": 200 },
  reputation: { "faction.varga_crew": 10 },
  quests: {},
  dialogue: {},
};

describe("World save migration (v1 -> current)", () => {
  it("upgrades a v1 save: adds npcDialogue + unlockedExits, preserves the rest", () => {
    const migrated = migrateWorld(v1Save);
    expect(migrated.version).toBe(WORLD_VERSION);
    expect(migrated.npcDialogue).toEqual({});
    expect(migrated.unlockedExits).toEqual({});
    // existing state is carried through untouched
    expect(migrated.seed).toBe("ashfall");
    expect(migrated.tick).toBe(7);
    expect(migrated.flags["flag.met_varga" as never]).toBe(true);
    expect(migrated.player.skills.force).toBe(3);
  });

  it("is a no-op on already-current saves", () => {
    const current = migrateWorld(v1Save);
    expect(migrateWorld(current)).toEqual(current);
  });

  it("refuses a save newer than the tool supports", () => {
    expect(() => migrateWorld({ ...v1Save, version: WORLD_VERSION + 1 })).toThrowError(/newer/);
  });
});
