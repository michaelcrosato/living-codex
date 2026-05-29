import { describe, it, expect } from "vitest";
import { WORLD_VERSION } from "./world";
import { migrateWorld, runMigrations, type Migration } from "./migrate";

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

describe("World save migration (engine-core, runtime-usable)", () => {
  it("upgrades a v1 save: adds npcDialogue + unlockedExits, preserves the rest", () => {
    const m = migrateWorld(v1Save);
    expect(m.version).toBe(WORLD_VERSION);
    expect(m.npcDialogue).toEqual({});
    expect(m.unlockedExits).toEqual({});
    expect(m.seed).toBe("ashfall");
    expect(m.tick).toBe(7);
    expect(m.flags["flag.met_varga" as never]).toBe(true);
    expect(m.player.skills.force).toBe(3);
  });

  it("is a no-op on an already-current save", () => {
    const current = migrateWorld(v1Save);
    expect(migrateWorld(current)).toEqual(current);
  });

  it("refuses a save newer than this build supports", () => {
    expect(() => migrateWorld({ ...v1Save, version: WORLD_VERSION + 1 })).toThrowError(/newer/);
  });

  it("runMigrations fails loudly on a missing step", () => {
    const steps: Migration[] = [{ from: 0, to: 1, migrate: (d) => ({ ...d, version: 1 }) }];
    // jump straight to target 3 with no 1->2 step
    expect(() => runMigrations({ version: 1 }, 3, steps, "Thing")).toThrowError(/no migration/);
  });
});
