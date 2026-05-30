import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { ContentPack, NpcId, DialogueId, LocationId } from "@codex/content-schema";
import { InkNarrative } from "@codex/narrative-ink";
import { GameSession } from "../src/session";

/**
 * P3 (T-14c) — the GOAL.md §4 milestone, proven. The pipeline-generated pack and the
 * hand-authored pack load through the IDENTICAL content-loader path with ZERO engine
 * special-casing, and a generated NPC's dialogue plays through the same narrative path.
 */
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8"));
const opening = read("content/core/pack.opening/pack.json");
const patrons = read("content/generated/pack.the_drip_patrons/pack.json");

// Loaded together through the SAME loadPacks — order-independent (patrons dependsOn pack.opening).
const { registries, fingerprint } = loadPacks([patrons, opening]);

describe("generated content loads through the same path (GOAL §4 milestone)", () => {
  it("hand-authored and pipeline-generated NPCs share one registry, indistinguishably", () => {
    expect(registries.npcs.has(NpcId.parse("npc.varga"))).toBe(true); // hand-authored
    expect(registries.npcs.has(NpcId.parse("npc.the_archivist"))).toBe(true); // pipeline-generated
    expect(registries.npcs.has(NpcId.parse("npc.drip_rumor"))).toBe(true);
    expect(registries.npcs.size).toBe(13); // 3 (opening: varga, guard, stranger) + 10 (generated)
  });

  it("cross-pack references resolve through the one integrity pass", () => {
    // a generated patron grounded in a faction defined in the hand-authored pack
    const bex = registries.npcs.get(NpcId.parse("npc.drip_bex"));
    expect(bex?.faction).toBe("faction.ashfall_syndicate");
    expect(registries.factions.has(bex!.faction!)).toBe(true);
  });

  it("the generated pack carries full curation provenance (SCHEMA §8)", () => {
    const pack = ContentPack.parse(patrons);
    expect(pack.id).toBe("pack.the_drip_patrons");
    expect(pack.provenance.authoredBy).toBe("pipeline");
    expect(pack.provenance.curatedBy).toBe("operator");
    expect(pack.provenance.approvedAt).toBeDefined();
    expect(pack.npcs.length).toBe(10);
  });

  it("a generated NPC's dialogue plays through the identical narrative path", () => {
    const asset = registries.dialogues.get(DialogueId.parse("dialogue.the_archivist"));
    expect(asset).toBeDefined();
    const session = new InkNarrative().load(asset!.compiled);
    const frame = session.current();
    expect(frame.text.toLowerCase()).toContain("warehouse"); // the hook line
    expect(frame.choices.length).toBe(2);
    session.choose(0); // advances with no special-casing
    session.current(); // continue past the choice so the `~ set` runs
    expect(session.getVar("met_archivist")).toBe(true);
  });

  it("the warehouse rumor patron flips its declared var (mirrors to a flag in play)", () => {
    const asset = registries.dialogues.get(DialogueId.parse("dialogue.drip_rumor"));
    const session = new InkNarrative().load(asset!.compiled);
    session.current();
    session.choose(0);
    session.current();
    expect(session.getVar("heard_warehouse_rumor")).toBe(true);
    expect(asset?.declaredVars).toContain("heard_warehouse_rumor");
  });
});

/**
 * SPEC-59 — the generated patrons are PLACED in the world, not just loaded. They home at
 * location.the_drip; a session started there spawns all 10 (deterministically scattered in-bounds),
 * so a player who enters the Drip finds it populated by the generated cast — proving reachability,
 * the gap generated-content's load+dialogue tests didn't cover (the kestrel-class blind spot).
 */
const PATRONS = [
  "npc.drip_bartender",
  "npc.drip_rumor",
  "npc.drip_pell",
  "npc.drip_wren",
  "npc.drip_bex",
  "npc.drip_sull",
  "npc.drip_yi",
  "npc.drip_halo",
  "npc.drip_grin",
  "npc.the_archivist",
];

describe("generated patrons are reachable — spawned at the Drip (SPEC-59)", () => {
  const THE_DRIP = LocationId.parse("location.the_drip");
  const session = new GameSession(registries, fingerprint, new InkNarrative(), {
    seed: "patrons",
    startLocationId: THE_DRIP,
    startPos: { x: 50, y: 50 },
  });
  const bounds = registries.locations.get(THE_DRIP)!.bounds;

  it("spawns all 10 generated patrons at the Drip, alive and in-bounds", () => {
    for (const id of PATRONS) {
      const e = session.world.entities[`entity.${id}`];
      expect(e, `${id} should be spawned at the Drip`).toBeDefined();
      expect(e!.locationId).toBe("location.the_drip");
      expect(e!.alive).toBe(true);
      expect(e!.pos.x).toBeGreaterThanOrEqual(0);
      expect(e!.pos.x).toBeLessThan(bounds.w);
      expect(e!.pos.y).toBeGreaterThanOrEqual(0);
      expect(e!.pos.y).toBeLessThan(bounds.h);
    }
  });

  it("every patron declares the Drip as home (so any pack that loads them places them)", () => {
    for (const id of PATRONS) {
      expect(registries.npcs.get(NpcId.parse(id))?.homeLocationId).toBe("location.the_drip");
    }
  });
});
