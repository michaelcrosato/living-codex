import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { LocationId, FlagId } from "@codex/content-schema";
import { createWorld, applyEvent, interactionSystem } from "@codex/engine-core";

/**
 * SPEC-80 — the Old Safehouse is the amnesia thread's destination: reachable from the hub only via an exit
 * gated on flag.learned_origin (SPEC-73's payoff). Proves the engine-enforced exit.requires gate end-to-end:
 * barred before you learn your origin, open after.
 */
const opening = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const { registries } = loadPacks([opening]);
const DISTRICT = LocationId.parse("location.ashfall_district");
const LEARNED = FlagId.parse("flag.learned_origin");
const ctx = { locations: registries.locations, npcs: registries.npcs };
const district = registries.locations.get(DISTRICT)!;
const safehouseExit = district.exits.findIndex((e) => e.toLocationId === "location.old_safehouse");

describe("old safehouse: learned_origin-gated exit (SPEC-80)", () => {
  it("the safehouse exists and is reachable via a gated exit from the hub", () => {
    expect(registries.locations.has(LocationId.parse("location.old_safehouse"))).toBe(true);
    expect(safehouseExit).toBeGreaterThanOrEqual(0);
    expect(district.exits[safehouseExit]!.requires.length).toBeGreaterThan(0); // it's gated
  });

  it("is BARRED before learning your origin, and OPENS after (real interactionSystem gate)", () => {
    const atExit = createWorld({ seed: "sh", startLocationId: DISTRICT, startPos: { x: 50, y: 50 } });
    const barred = interactionSystem([{ type: "UseExit", exitIndex: safehouseExit }], ctx)(atExit, 0);
    expect(barred.some((e) => e.type === "EnterLocation")).toBe(false); // gate holds

    const unlocked = applyEvent(atExit, { type: "SetFlag", flag: LEARNED, to: true });
    const passed = interactionSystem([{ type: "UseExit", exitIndex: safehouseExit }], ctx)(unlocked, 0);
    expect(
      passed.some((e) => e.type === "EnterLocation" && e.locationId === "location.old_safehouse"),
    ).toBe(true);
  });
});
