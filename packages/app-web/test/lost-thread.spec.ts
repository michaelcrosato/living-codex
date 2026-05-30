import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { QuestId, FlagId, DialogueId } from "@codex/content-schema";
import { InkNarrative } from "@codex/narrative-ink";
import {
  createWorld,
  applyEvent,
  applyEvents,
  questSystem,
  reactionsSystem,
} from "@codex/engine-core";
import { LocationId } from "@codex/content-schema";
import { DialogueController } from "./../src/dialogue-controller";

/**
 * SPEC-73 — "What You Forgot": the cold-open amnesia payoff. The stranger ("knows how you got to Ashfall")
 * opens up once the player has the drive (reactsTo → dialogue.stranger_truth), and quest.lost_thread lets
 * the player press/bargain for the truth — a personal-stakes thread tying the opening hook to gameplay.
 */
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8"));
const opening = read("content/core/pack.opening/pack.json");
const lostThread = read("content/core/pack.lost_thread/pack.json");
const { registries } = loadPacks([lostThread, opening]);

const QID = QuestId.parse("quest.lost_thread");
const DISTRICT = LocationId.parse("location.ashfall_district");
const HAS_DRIVE = FlagId.parse("flag.has_drive");
const STRANGER_DLG = DialogueId.parse("dialogue.stranger");

describe("lost-thread amnesia payoff (SPEC-73)", () => {
  it("the quest loads same-path and is gated on flag.has_drive (engine offer path)", () => {
    expect(registries.quests.has(QID)).toBe(true);
    const offered = (w: ReturnType<typeof createWorld>): boolean =>
      questSystem(registries.quests, [])(w, 0).some(
        (e) => e.type === "ActivateQuest" && e.questId === QID,
      );
    const noDrive = createWorld({ seed: "lost", startLocationId: DISTRICT });
    expect(offered(noDrive)).toBe(false);
    expect(offered(applyEvent(noDrive, { type: "SetFlag", flag: HAS_DRIVE, to: true }))).toBe(true);
  });

  it("the stranger's dialogue opens to the truth once the player has the drive (reactsTo)", () => {
    const controller = new DialogueController(registries, new InkNarrative());
    let w = createWorld({ seed: "lost", startLocationId: DISTRICT });
    expect(controller.openFor(w, "npc.stranger")!.dialogueId).toBe("dialogue.stranger"); // before
    w = applyEvent(w, { type: "SetFlag", flag: HAS_DRIVE, to: true });
    w = applyEvents(w, reactionsSystem(registries.npcs)(w, 0));
    expect(controller.openFor(w, "npc.stranger")!.dialogueId).toBe("dialogue.stranger_truth"); // after
  });

  it("the bargain branch completes end-to-end with the revelation consequence", () => {
    let w = createWorld({ seed: "lost", startLocationId: DISTRICT, skills: { persuade: 20 } });
    w = applyEvent(w, { type: "SetFlag", flag: HAS_DRIVE, to: true });
    w = applyEvent(w, {
      type: "DialogueAdvanced",
      dialogueId: STRANGER_DLG,
      inkState: "{}",
      flags: {},
    });
    const attempt = [{ type: "Attempt" as const, questId: QID, branchId: "bargain" }];
    for (let t = 0; t < 8 && w.quests[QID]?.status !== "completed"; t++) {
      w = applyEvents(w, questSystem(registries.quests, attempt, registries.npcs)(w, 0));
    }
    expect(w.quests[QID]?.completedBranchId).toBe("bargain");
    expect(w.flags[FlagId.parse("flag.bought_truth")]).toBe(true);
    expect(w.flags[FlagId.parse("flag.learned_origin")]).toBe(true); // onAnyComplete
    expect(w.flags[FlagId.parse("flag.lost_thread_resolved")]).toBe(true);
  });
});
