import { describe, it, expect } from "vitest";
import { loadPacks } from "@codex/content-loader";
import { NpcId, QuestId, FactionId } from "@codex/content-schema";
import openingPack from "../../../content/core/pack.opening/pack.json";
import districtBarks from "../../../content/core/pack.district_barks/pack.json";
import dripMarket from "../../../content/core/pack.drip_market/pack.json";
import syndicateOffer from "../../../content/core/pack.syndicate_offer/pack.json";
import kestrel from "../../../content/core/pack.kestrel/pack.json";
import dripPatrons from "../../../content/generated/pack.the_drip_patrons/pack.json";

/**
 * SPEC-51 — guards the LIVE boot pack set. `main.ts` loads a SUBSET of the on-disk packs, while
 * `content:validate` only ever loads the SUPERSET of all of them — and per the SPEC-35/42 layering
 * trap, a subset can harbor a dangling cross-pack reference the superset masks. This test loads the
 * EXACT set `main.ts` boots (keep the two lists in lockstep) and asserts it resolves in one integrity
 * pass, with a signature entity from each live pack present — so a future pack that breaks the live
 * boot fails here, not silently in the browser.
 */
const LIVE_PACKS = [openingPack, districtBarks, dripMarket, syndicateOffer, kestrel, dripPatrons];

describe("live boot pack set (SPEC-51)", () => {
  it("the exact set main.ts loads resolves in one integrity pass", () => {
    expect(() => loadPacks(LIVE_PACKS)).not.toThrow();
  });

  it("a signature entity from each live pack is reachable in the one registry", () => {
    const { registries } = loadPacks(LIVE_PACKS);
    expect(registries.npcs.has(NpcId.parse("npc.varga"))).toBe(true); // pack.opening
    expect(registries.npcs.has(NpcId.parse("npc.drip_vendor"))).toBe(true); // pack.drip_market
    expect(registries.quests.has(QuestId.parse("quest.syndicate_offer"))).toBe(true); // pack.syndicate_offer
    expect(registries.npcs.has(NpcId.parse("npc.kestrel"))).toBe(true); // pack.kestrel (newly wired live)
    expect(registries.quests.has(QuestId.parse("quest.rival_offer"))).toBe(true); // pack.kestrel
    expect(registries.factions.has(FactionId.parse("faction.kestrel_outfit"))).toBe(true); // pack.kestrel
    expect(registries.npcs.has(NpcId.parse("npc.the_archivist"))).toBe(true); // pack.the_drip_patrons (generated)
  });

  it("pack.bribe_demo is deliberately NOT in the live set (uncurated extensibility demo)", () => {
    const { registries } = loadPacks(LIVE_PACKS);
    expect(registries.quests.has(QuestId.parse("quest.grease_the_wheels"))).toBe(false);
  });
});
