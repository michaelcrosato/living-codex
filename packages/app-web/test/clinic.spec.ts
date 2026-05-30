import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { NpcId, QuestId, FlagId, DialogueId, LocationId } from "@codex/content-schema";
import { InkNarrative } from "@codex/narrative-ink";
import { createWorld, applyEvent, applyEvents, questSystem, reactionsSystem } from "@codex/engine-core";
import { GameSession } from "./../src/session";
import { DialogueController } from "./../src/dialogue-controller";

/**
 * SPEC-67 — the back-alley clinic thread. A new neutral beat: the clinic LOCATION lives in pack.opening
 * (base geography, reachable from the hub), the medic + dialogue + quest overlay from pack.clinic (the
 * SPEC-35/42 layering rule). Proves: same-path load, the medic SPAWNS at the clinic (reachability — the
 * SPEC-59 lesson), her Ink plays, and her debt quest offers + completes through the real engine.
 */
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8"));
const opening = read("content/core/pack.opening/pack.json");
const clinic = read("content/core/pack.clinic/pack.json");
const { registries, fingerprint } = loadPacks([clinic, opening]);

const MEDIC = NpcId.parse("npc.clinic_medic");
const QID = QuestId.parse("quest.clinic_debt");
const CLINIC = LocationId.parse("location.ashfall_clinic");
const DLG = DialogueId.parse("dialogue.clinic_medic");
const MET = FlagId.parse("flag.met_medic");

describe("ashfall clinic thread (SPEC-67)", () => {
  it("loads same-path; the clinic is base geography (pack.opening) and the medic overlays (pack.clinic)", () => {
    expect(registries.locations.has(CLINIC)).toBe(true); // geography from pack.opening
    expect(registries.npcs.get(MEDIC)?.homeLocationId).toBe("location.ashfall_clinic");
    expect(registries.npcs.get(MEDIC)?.faction).toBeUndefined(); // neutral — nobody's medic
    expect(registries.quests.has(QID)).toBe(true);
  });

  it("the clinic is reachable from the hub (a district exit leads there)", () => {
    const district = registries.locations.get(LocationId.parse("location.ashfall_district"))!;
    expect(district.exits.some((e) => e.toLocationId === "location.ashfall_clinic")).toBe(true);
  });

  it("the medic spawns at the clinic (a session started there places her)", () => {
    const session = new GameSession(registries, fingerprint, new InkNarrative(), {
      seed: "clinic",
      startLocationId: CLINIC,
      startPos: { x: 50, y: 50 },
    });
    const e = session.world.entities["entity.npc.clinic_medic"];
    expect(e, "the medic should spawn at the clinic").toBeDefined();
    expect(e!.locationId).toBe("location.ashfall_clinic");
    expect(e!.alive).toBe(true);
  });

  it("the medic's Ink plays through the identical narrative path", () => {
    const asset = registries.dialogues.get(DLG);
    expect(asset).toBeDefined();
    const s = new InkNarrative().load(asset!.compiled);
    expect(s.current().choices.length).toBe(3);
    s.choose(0);
    s.current();
    expect(s.getVar("met_medic")).toBe(true);
  });

  it("the debt quest offers on met_medic and a branch completes end-to-end", () => {
    const offers = (set: boolean): boolean => {
      let w = createWorld({ seed: "clinic", startLocationId: CLINIC });
      if (set) w = applyEvent(w, { type: "SetFlag", flag: MET, to: true });
      return questSystem(registries.quests, [])(w, 0).some(
        (ev) => ev.type === "ActivateQuest" && ev.questId === QID,
      );
    };
    expect(offers(false)).toBe(false);
    expect(offers(true)).toBe(true);

    // complete talk_down: talk_to medic + reach drip_market + persuade
    let w = createWorld({ seed: "clinic", startLocationId: CLINIC, skills: { persuade: 20 } });
    w = applyEvent(w, { type: "SetFlag", flag: MET, to: true });
    w = applyEvent(w, { type: "DialogueAdvanced", dialogueId: DLG, inkState: "{}", flags: {} });
    w = applyEvent(w, {
      type: "EnterLocation",
      locationId: LocationId.parse("location.drip_market"),
      spawnAt: { x: 50, y: 50 },
    });
    const attempt = [{ type: "Attempt" as const, questId: QID, branchId: "talk_down" }];
    for (let t = 0; t < 10 && w.quests[QID]?.status !== "completed"; t++) {
      w = applyEvents(w, questSystem(registries.quests, attempt, registries.npcs)(w, 0));
    }
    expect(w.quests[QID]?.completedBranchId).toBe("talk_down");
    expect(w.flags[FlagId.parse("flag.clinic_debt_settled")]).toBe(true);
    expect(w.flags[FlagId.parse("flag.clinic_debt_resolved")]).toBe(true);
  });

  // SPEC-77 — the training quest exercises modify_skill (progression) + give_item; has_item gates a storylet.
  it("the training quest raises tech (modify_skill) and grants the field kit", () => {
    let w = createWorld({ seed: "train", startLocationId: CLINIC, skills: { tech: 15 } });
    w = applyEvent(w, { type: "SetFlag", flag: FlagId.parse("flag.clinic_debt_resolved"), to: true });
    w = applyEvent(w, { type: "DialogueAdvanced", dialogueId: DLG, inkState: "{}", flags: {} });
    const TQ = QuestId.parse("quest.clinic_training");
    const attempt = [{ type: "Attempt" as const, questId: TQ, branchId: "train" }];
    for (let t = 0; t < 8 && w.quests[TQ]?.status !== "completed"; t++) {
      w = applyEvents(w, questSystem(registries.quests, attempt, registries.npcs)(w, 0));
    }
    expect(w.quests[TQ]?.completedBranchId).toBe("train");
    // modify_skill raises the situational conditionMods (the effective-skill bonus), not the base skill.
    expect(w.player.conditionMods.tech).toBe(1); // +1 from training
    expect(w.player.skills.tech).toBe(15); // base unchanged (by design)
    expect((w.inventory as Record<string, number>)["item.field_kit"]).toBeGreaterThanOrEqual(1); // give_item
    expect(w.flags[FlagId.parse("flag.clinic_training_resolved")]).toBe(true);
  });

  // SPEC-69 — the neutral medic ("treats both, tells neither") reacts to the player's faction standing.
  it("the medic reacts to faction standing (joined Syndicate / Varga's inner circle), default otherwise", () => {
    const controller = new DialogueController(registries, new InkNarrative());
    const after = (flag?: string): string => {
      let world = createWorld({ seed: "medic", startLocationId: CLINIC });
      if (flag) world = applyEvent(world, { type: "SetFlag", flag: FlagId.parse(flag), to: true });
      world = applyEvents(world, reactionsSystem(registries.npcs)(world, 0));
      return controller.openFor(world, "npc.clinic_medic")!.dialogueId;
    };
    expect(after("flag.syndicate_made_member")).toBe("dialogue.medic_syndicate");
    expect(after("flag.varga_inner_circle")).toBe("dialogue.medic_varga");
    expect(after()).toBe("dialogue.clinic_medic"); // default offer line
  });
});
