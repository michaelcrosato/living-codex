import { describe, it, expect } from "vitest";
import { createWorld, WORLD_VERSION } from "@codex/engine-core";
import { LocationId } from "@codex/content-schema";
import { importSave } from "./index";

/**
 * SPEC-120 — importSave must forward-migrate the snapshot World, symmetric with loadGame
 * (store.ts). Without it, a save file exported by an older build (version 1, missing the v2
 * npcDialogue/unlockedExits maps) imports as-is and the next session.step throws in
 * reactionsSystem (world.npcDialogue[...] on undefined). The IndexedDB O-key path (loadGame)
 * already migrates; the I-key import path (importSave) did not — a save-load asymmetry.
 */
describe("importSave (SPEC-120 migrate-on-import)", () => {
  it("forward-migrates a v1 world so a file exported by an older build still imports", () => {
    // A current (v2) world, then simulate a v1 save: older version, missing the v2 maps.
    const current = createWorld({
      seed: "s",
      startLocationId: LocationId.parse("location.start"),
    });
    const v1World: Record<string, unknown> = { ...current, version: 1 };
    delete v1World.npcDialogue;
    delete v1World.unlockedExits;
    // importSave only reads `.world`; other envelope fields pass through untouched.
    const v1Save = { world: v1World, logSinceSnapshot: [], contentFingerprint: "fp" };

    const restored = importSave(JSON.stringify(v1Save));

    expect(restored.world.version).toBe(WORLD_VERSION);
    expect(restored.world.npcDialogue).toBeDefined();
    expect(restored.world.unlockedExits).toBeDefined();
  });

  it("is a no-op on a current-version world (round-trips unchanged)", () => {
    const current = createWorld({
      seed: "s2",
      startLocationId: LocationId.parse("location.start"),
    });
    const save = { world: current, logSinceSnapshot: [], contentFingerprint: "fp" };
    const restored = importSave(JSON.stringify(save));
    expect(restored.world.version).toBe(WORLD_VERSION);
  });
});
