import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { NpcId, FactionId, QuestId, FlagId, DialogueId, LocationId } from "@codex/content-schema";
import { InkNarrative } from "@codex/narrative-ink";
import { createWorld, applyEvent, applyEvents, questSystem } from "@codex/engine-core";

/**
 * SPEC-13 — the hand-curated rival-fixer pack loads through the IDENTICAL content-loader path as
 * the hand-authored and pipeline-generated packs (one registry, cross-pack refs resolved in one
 * integrity pass), and its branching quest plays end-to-end through the real engine (talk_to +
 * skill_check → branch completion), with zero engine special-casing.
 */
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8"));
const opening = read("content/core/pack.opening/pack.json");
const patrons = read("content/generated/pack.the_drip_patrons/pack.json");
const kestrel = read("content/core/pack.kestrel/pack.json");

// loaded together through the SAME loadPacks — order-independent (kestrel dependsOn pack.opening)
const { registries } = loadPacks([kestrel, patrons, opening]);

const QID = QuestId.parse("quest.rival_offer");
const KESTREL = NpcId.parse("npc.kestrel");
const OUTFIT = FactionId.parse("faction.kestrel_outfit");
const VARGA_CREW = FactionId.parse("faction.varga_crew");
const DLG = DialogueId.parse("dialogue.kestrel");
const MET = FlagId.parse("flag.met_varga");
const DISTRICT = LocationId.parse("location.ashfall_district");

describe("rival-fixer pack: same-path load + play (SPEC-13)", () => {
  it("shares one registry with hand-authored + pipeline-generated content", () => {
    expect(registries.npcs.has(KESTREL)).toBe(true); // this pack (hand-curated)
    expect(registries.npcs.has(NpcId.parse("npc.varga"))).toBe(true); // pack.opening
    expect(registries.npcs.has(NpcId.parse("npc.the_archivist"))).toBe(true); // generated
    expect(registries.quests.has(QID)).toBe(true);
  });

  it("cross-pack references resolve in one integrity pass", () => {
    const outfit = registries.factions.get(OUTFIT);
    expect(outfit?.rivals).toContain("faction.varga_crew"); // points at a faction from pack.opening
    expect(registries.factions.has(VARGA_CREW)).toBe(true);
    expect(registries.npcs.get(KESTREL)?.faction).toBe("faction.kestrel_outfit");
    expect(registries.npcs.get(KESTREL)?.homeLocationId).toBe("location.ashfall_district"); // opening's location
  });

  it("Kestrel's Ink dialogue plays through the identical narrative path", () => {
    const asset = registries.dialogues.get(DLG);
    expect(asset).toBeDefined();
    const session = new InkNarrative().load(asset!.compiled);
    expect(session.current().choices.length).toBe(3);
    session.choose(0);
    session.current(); // continue past the choice so the `~ set` runs
    expect(session.getVar("met_kestrel")).toBe(true);
  });

  it("the quest offers, talk_to + skill_check resolve, and a branch completes via the real engine", () => {
    let w = createWorld({ seed: "rival", startLocationId: DISTRICT, skills: { tech: 20 } });
    w = applyEvent(w, { type: "SetFlag", flag: MET, to: true });
    // talking to Kestrel = engaging her dialogue (captured into world.dialogue — the talk_to signal)
    w = applyEvent(w, { type: "DialogueAdvanced", dialogueId: DLG, inkState: "{}", flags: {} });

    const attempt = [{ type: "Attempt" as const, questId: QID, branchId: "take_job" }];
    for (let t = 0; t < 8 && w.quests[QID]?.status !== "completed"; t++) {
      w = applyEvents(w, questSystem(registries.quests, attempt, registries.npcs)(w, 0));
    }

    expect(w.quests[QID]?.completedBranchId).toBe("take_job");
    expect(w.flags[FlagId.parse("flag.sided_with_kestrel")]).toBe(true);
    expect(w.flags[FlagId.parse("flag.rival_resolved")]).toBe(true); // onAnyComplete
    expect(w.reputation[VARGA_CREW]).toBe(-10); // siding with the rival costs Varga rep
  });
});
