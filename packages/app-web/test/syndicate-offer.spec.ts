import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { NpcId, FactionId, QuestId, FlagId, DialogueId, LocationId } from "@codex/content-schema";
import { InkNarrative } from "@codex/narrative-ink";
import { createWorld, applyEvent, applyEvents, questSystem } from "@codex/engine-core";

/**
 * SPEC-50 — the hand-curated "The City's Cut" pack (the Syndicate's offer) loads through the
 * IDENTICAL content-loader path as the hand-authored and pipeline-generated packs, gives the
 * Ashfall Syndicate an NPC face, and its branching quest plays end-to-end through the real engine.
 * The quest chains off the warehouse drive (`flag.has_drive`): it must NOT offer until the player
 * holds the drive, and MUST offer once they do — proven via the engine's own offer path (questSystem
 * emits ActivateQuest when offerWhen passes), with zero engine special-casing.
 */
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8"));
const opening = read("content/core/pack.opening/pack.json");
const patrons = read("content/generated/pack.the_drip_patrons/pack.json");
const syndicate = read("content/core/pack.syndicate_offer/pack.json");

// loaded together through the SAME loadPacks — order-independent (syndicate dependsOn pack.opening)
const { registries } = loadPacks([syndicate, patrons, opening]);

const QID = QuestId.parse("quest.syndicate_offer");
const BROKER = NpcId.parse("npc.syndicate_broker");
const SYNDICATE = FactionId.parse("faction.ashfall_syndicate");
const VARGA_CREW = FactionId.parse("faction.varga_crew");
const DLG = DialogueId.parse("dialogue.syndicate_broker");
const HAS_DRIVE = FlagId.parse("flag.has_drive");
const THE_DRIP = LocationId.parse("location.the_drip");

describe("syndicate-offer pack: same-path load + play (SPEC-50)", () => {
  it("shares one registry with hand-authored + pipeline-generated content", () => {
    expect(registries.npcs.has(BROKER)).toBe(true); // this pack (hand-curated)
    expect(registries.npcs.has(NpcId.parse("npc.varga"))).toBe(true); // pack.opening
    expect(registries.npcs.has(NpcId.parse("npc.the_archivist"))).toBe(true); // generated
    expect(registries.quests.has(QID)).toBe(true);
  });

  it("gives the Syndicate an NPC face whose cross-pack refs resolve in one integrity pass", () => {
    // the faction + home location it references both live in pack.opening
    expect(registries.factions.has(SYNDICATE)).toBe(true);
    expect(registries.npcs.get(BROKER)?.faction).toBe("faction.ashfall_syndicate");
    expect(registries.npcs.get(BROKER)?.homeLocationId).toBe("location.the_drip");
    expect(registries.locations.has(THE_DRIP)).toBe(true);
  });

  it("the broker's Ink dialogue plays through the identical narrative path", () => {
    const asset = registries.dialogues.get(DLG);
    expect(asset).toBeDefined();
    const session = new InkNarrative().load(asset!.compiled);
    expect(session.current().choices.length).toBe(3);
    session.choose(0);
    session.current(); // continue past the choice so the `~ set` runs
    expect(session.getVar("met_broker")).toBe(true);
  });

  it("does NOT offer without the drive, but DOES once flag.has_drive is set (engine offer path)", () => {
    const offered = (w: ReturnType<typeof createWorld>): boolean =>
      questSystem(registries.quests, [])(w, 0).some(
        (e) => e.type === "ActivateQuest" && e.questId === QID,
      );

    const noDrive = createWorld({ seed: "syndicate", startLocationId: THE_DRIP });
    expect(offered(noDrive)).toBe(false); // gated on flag.has_drive

    const withDrive = applyEvent(noDrive, { type: "SetFlag", flag: HAS_DRIVE, to: true });
    expect(offered(withDrive)).toBe(true); // chains off quest.the_warehouse
  });

  it("a branch completes end-to-end through the real engine and applies its consequences", () => {
    // skills high enough to pass the `sell` branch's persuade DC 12
    let w = createWorld({ seed: "syndicate", startLocationId: THE_DRIP, skills: { persuade: 20 } });
    w = applyEvent(w, { type: "SetFlag", flag: HAS_DRIVE, to: true });
    // talking to the broker = engaging her dialogue (captured into world.dialogue — the talk_to signal)
    w = applyEvent(w, { type: "DialogueAdvanced", dialogueId: DLG, inkState: "{}", flags: {} });

    const attempt = [{ type: "Attempt" as const, questId: QID, branchId: "sell" }];
    for (let t = 0; t < 8 && w.quests[QID]?.status !== "completed"; t++) {
      w = applyEvents(w, questSystem(registries.quests, attempt, registries.npcs)(w, 0));
    }

    expect(w.quests[QID]?.completedBranchId).toBe("sell");
    expect(w.flags[FlagId.parse("flag.sold_drive")]).toBe(true); // onComplete
    expect(w.flags[FlagId.parse("flag.syndicate_resolved")]).toBe(true); // onAnyComplete
    expect(w.reputation[SYNDICATE]).toBe(12); // selling the data earns Syndicate favor
    expect(w.reputation[VARGA_CREW]).toBe(-8); // ...at Varga's expense
  });
});
