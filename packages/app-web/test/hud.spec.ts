import { describe, it, expect } from "vitest";
import type { Registries } from "@codex/content-loader";
import { LocationId, type FlagId } from "@codex/content-schema";
import { createWorld, applyEvent, type World } from "@codex/engine-core";
import { renderHud } from "../src/hud";

/**
 * SPEC-56 — first test for renderHud. Pins the consequence-journal contract: each arc consequence
 * line renders iff its flag is set, alongside the pre-existing warehouse-entry lines. Uses a stub
 * element (just a textContent sink) and empty registries (the location name falls back to the id).
 */
const START = LocationId.parse("location.start");
const emptyRegistries: Registries = {
  npcs: new Map(),
  quests: new Map(),
  locations: new Map(),
  factions: new Map(),
  items: new Map(),
  dialogues: new Map(),
  storylets: new Map(),
};

/** Render a fresh world (optionally with the given flags set true) and return the HUD text. */
function hud(flags: readonly string[]): string {
  let world: World = createWorld({ seed: "hud", startLocationId: START });
  for (const f of flags) world = applyEvent(world, { type: "SetFlag", flag: f as FlagId, to: true });
  const el = { textContent: "" } as unknown as HTMLElement;
  renderHud(el, world, emptyRegistries);
  return el.textContent ?? "";
}

describe("renderHud consequence journal (SPEC-56)", () => {
  it("renders the location line and no consequence lines for a clean world", () => {
    const text = hud([]);
    expect(text).toContain("location.start"); // name falls back to id with empty registries
    expect(text).not.toContain("You sold the drive");
    expect(text).not.toContain("You threw in with Kestrel");
    expect(text).not.toContain("You have the drive");
  });

  it("surfaces each Syndicate/rival arc consequence only when its flag is set", () => {
    expect(hud(["flag.sold_drive"])).toContain("You sold the drive to the Syndicate.");
    expect(hud(["flag.knows_syndicate_secret"])).toContain("You know what's on the drive.");
    expect(hud(["flag.leveraged_syndicate"])).toContain("holding the drive over the Syndicate.");
    expect(hud(["flag.sided_with_kestrel"])).toContain("You threw in with Kestrel.");
    expect(hud(["flag.refused_kestrel"])).toContain("You stayed loyal to Varga.");
  });

  it("still renders the pre-existing warehouse-entry consequence lines", () => {
    expect(hud(["flag.has_drive"])).toContain("You have the drive.");
    expect(hud(["flag.entered_peacefully"])).toContain("You talked your way in.");
    expect(hud(["flag.entered_unseen"])).toContain("You were never seen.");
    expect(hud(["flag.syndicate_marked"])).toContain("The Syndicate has marked you.");
  });

  it("a flag set false does not render its line", () => {
    let world: World = createWorld({ seed: "hud", startLocationId: START });
    world = applyEvent(world, { type: "SetFlag", flag: "flag.sold_drive" as FlagId, to: false });
    const el = { textContent: "" } as unknown as HTMLElement;
    renderHud(el, world, emptyRegistries);
    expect(el.textContent ?? "").not.toContain("You sold the drive");
  });
});

/**
 * SPEC-71 — the HUD surfaces the current location's authored ambientText (previously rendered nowhere).
 * Deterministic slow rotation by tick (tick 0 → ambientText[0]); absent when the location has none.
 */
const loc = (id: string, ambientText: string[]): Record<string, unknown> => ({
  id,
  name: id,
  mood: "m",
  bounds: { w: 10, h: 10 },
  art: [],
  exits: [],
  npcSpawns: [],
  ambientText,
});
function hudAt(locId: string, locations: Record<string, unknown>[]): string {
  const regs: Registries = {
    ...emptyRegistries,
    locations: new Map(locations.map((l) => [LocationId.parse(l.id as string), l as never])),
  };
  const world: World = createWorld({ seed: "amb", startLocationId: LocationId.parse(locId) });
  const el = { textContent: "" } as unknown as HTMLElement;
  renderHud(el, world, regs);
  return el.textContent ?? "";
}

describe("renderHud surfaces location ambientText (SPEC-71)", () => {
  it("shows the current location's ambient line when present (tick 0 → first line)", () => {
    const text = hudAt("location.start", [loc("location.start", ["A drone coughs past overhead.", "Rain on tin."])]);
    expect(text).toContain("~ A drone coughs past overhead.");
  });

  it("shows no ambient (~) line when the location has none", () => {
    const text = hudAt("location.bare", [loc("location.bare", [])]);
    expect(text).not.toContain("~ ");
  });
});
