import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { NpcId, QuestId, FlagId, LocationId } from "@codex/content-schema";
import {
  createWorld,
  applyEvent,
  applyEvents,
  questSystem,
  reactionsSystem,
} from "@codex/engine-core";
import { DialogueController } from "./../src/dialogue-controller";
import { InkNarrative } from "@codex/narrative-ink";

/**
 * SPEC-87 — "Someone's Brother": a human, non-faction, non-combat beat (tonal range for a slice that's
 * otherwise all fixers/crime). The kid asks you to find out what happened to her brother; offerWhen met_kid;
 * the single search branch resolves by reaching the warehouse floor.
 */
const opening = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const streetKid = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.street_kid/pack.json"), "utf8"),
) as unknown;
const { registries } = loadPacks([streetKid, opening]);

const QID = QuestId.parse("quest.lost_brother");
const DISTRICT = LocationId.parse("location.ashfall_district");
const MET_KID = FlagId.parse("flag.met_kid");

describe("street-kid human-moment beat (SPEC-87)", () => {
  it("the kid is a neutral, non-combat NPC reachable in the district", () => {
    const kid = registries.npcs.get(NpcId.parse("npc.street_kid"));
    expect(kid).toBeDefined();
    expect(kid?.faction).toBeUndefined(); // a resident, not a faction player
    expect(kid?.combat).toBeUndefined(); // non-combat
    expect(kid?.homeLocationId).toBe("location.ashfall_district");
  });

  it("offers only after meeting the kid, and the search resolves by reaching the warehouse floor", () => {
    const offered = (w: ReturnType<typeof createWorld>): boolean =>
      questSystem(registries.quests, [])(w, 0).some(
        (e) => e.type === "ActivateQuest" && e.questId === QID,
      );
    let w = createWorld({ seed: "kid", startLocationId: DISTRICT });
    expect(offered(w)).toBe(false);
    w = applyEvent(w, { type: "SetFlag", flag: MET_KID, to: true });
    expect(offered(w)).toBe(true);

    // activate, then reach the warehouse floor → the single search objective completes
    w = applyEvents(w, questSystem(registries.quests, [])(w, 0));
    w = applyEvent(w, {
      type: "EnterLocation",
      locationId: LocationId.parse("location.warehouse_floor"),
      spawnAt: { x: 5, y: 5 },
    });
    for (let t = 0; t < 6 && w.quests[QID]?.status !== "completed"; t++) {
      w = applyEvents(
        w,
        questSystem(
          registries.quests,
          [{ type: "Attempt", questId: QID, branchId: "search" }],
          registries.npcs,
        )(w, 0),
      );
    }
    expect(w.quests[QID]?.completedBranchId).toBe("search");
    expect(w.flags[FlagId.parse("flag.searched_for_tomas")]).toBe(true);
    expect(w.flags[FlagId.parse("flag.lost_brother_resolved")]).toBe(true);
  });

  it("after the search, facing the kid delivers the news (reactsTo) and latches told_the_kid (SPEC-88)", () => {
    const controller = new DialogueController(registries, new InkNarrative());
    let w = createWorld({ seed: "kid", startLocationId: DISTRICT });
    expect(controller.openFor(w, "npc.street_kid")!.dialogueId).toBe("dialogue.street_kid"); // before
    w = applyEvent(w, { type: "SetFlag", flag: FlagId.parse("flag.searched_for_tomas"), to: true });
    w = applyEvents(w, reactionsSystem(registries.npcs)(w, 0));
    expect(controller.openFor(w, "npc.street_kid")!.dialogueId).toBe("dialogue.street_kid_after"); // after
    expect(w.flags[FlagId.parse("flag.told_the_kid")]).toBe(true);
  });
});
