import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { ContentPack, NpcId, DialogueId } from "@codex/content-schema";
import { InkNarrative } from "@codex/narrative-ink";

/**
 * P3 (T-14c) — the GOAL.md §4 milestone, proven. The pipeline-generated pack and the
 * hand-authored pack load through the IDENTICAL content-loader path with ZERO engine
 * special-casing, and a generated NPC's dialogue plays through the same narrative path.
 */
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8"));
const opening = read("content/core/pack.opening/pack.json");
const patrons = read("content/generated/pack.the_drip_patrons/pack.json");

// Loaded together through the SAME loadPacks — order-independent (patrons dependsOn pack.opening).
const { registries } = loadPacks([patrons, opening]);

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
