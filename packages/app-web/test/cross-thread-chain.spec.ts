import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { QuestId, FlagId, FactionId, LocationId, type Quest } from "@codex/content-schema";
import { createWorld, applyEvent, applyEvents, questSystem, type World } from "@codex/engine-core";

/**
 * SPEC-95 — cross-thread integration. Per-spec tests verify each quest in ISOLATION (seeding flags); this
 * drives the actual CHAIN through the real engine: meet Varga → complete the warehouse (talk branch, by
 * reaching locations + passing the skill check) → that grants the drive (flag.has_drive) → which makes the
 * Syndicate offer chains → sell it → sold_drive + reputation. Catches integration breaks between threads that
 * isolated tests can't (e.g. the warehouse's onAnyComplete flag failing to gate the syndicate offer).
 */
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8"));
const { registries } = loadPacks([read("content/core/pack.syndicate_offer/pack.json"), read("content/core/pack.opening/pack.json")]);
const DISTRICT = LocationId.parse("location.ashfall_district");
const objKey = (b: string, i: number): string => `${b}#${i}`;

/** Drive a quest branch to completion by satisfying each objective in turn through the real questSystem. */
function driveBranch(w: World, questId: QuestId, branchId: string): World {
  const quest = registries.quests.get(questId) as Quest;
  const branch = quest.branches.find((b) => b.id === branchId)!;
  const attempt = [{ type: "Attempt" as const, questId, branchId }];
  for (let t = 0; t < 20 && w.quests[questId]?.status !== "completed"; t++) {
    const rt = w.quests[questId];
    if (rt?.status === "active") {
      let i = 0;
      while (i < branch.objectives.length && rt.objectiveProgress[objKey(branchId, i)]?.done) i++;
      const obj = branch.objectives[i];
      if (obj?.kind === "reach" && w.locationId !== obj.locationId) {
        w = applyEvent(w, { type: "EnterLocation", locationId: obj.locationId, spawnAt: { x: 5, y: 5 } });
      } else if (obj?.kind === "talk_to") {
        const dlg = registries.npcs.get(obj.npcId)!.dialogueId;
        w = applyEvent(w, { type: "DialogueAdvanced", dialogueId: dlg, inkState: "{}", flags: {} });
      }
    }
    w = applyEvents(w, questSystem(registries.quests, attempt, registries.npcs)(w, 0));
  }
  return w;
}

describe("cross-thread chain: warehouse → drive → Syndicate (SPEC-95)", () => {
  const WAREHOUSE = QuestId.parse("quest.the_warehouse");
  const SYNDICATE = QuestId.parse("quest.syndicate_offer");

  it("the warehouse grants the drive, which chains into the syndicate offer, end-to-end through the engine", () => {
    let w = createWorld({ seed: "chain", startLocationId: DISTRICT, skills: { persuade: 20 } });
    w = applyEvent(w, { type: "SetFlag", flag: FlagId.parse("flag.met_varga"), to: true });

    // Step 1: the warehouse offers (met_varga) and its talk branch completes by REACHING locations + persuade.
    w = applyEvents(w, questSystem(registries.quests, [])(w, 0)); // ActivateQuest the_warehouse
    expect(w.quests[WAREHOUSE]?.status).toBe("active");
    w = driveBranch(w, WAREHOUSE, "talk");
    expect(w.quests[WAREHOUSE]?.completedBranchId).toBe("talk");
    // Step 2: completing it granted the drive (onAnyComplete) — NOT seeded.
    expect(w.flags[FlagId.parse("flag.has_drive")]).toBe(true);
    expect((w.inventory as Record<string, number>)["item.encrypted_drive"]).toBeGreaterThanOrEqual(1);

    // Step 3: the drive chains the syndicate offer (offerWhen flag.has_drive) — the cross-thread link.
    const offers = questSystem(registries.quests, [])(w, 0).some((e) => e.type === "ActivateQuest" && e.questId === SYNDICATE);
    expect(offers).toBe(true);

    // Step 4: complete the syndicate sell branch and assert the chained consequences.
    w = driveBranch(w, SYNDICATE, "sell");
    expect(w.quests[SYNDICATE]?.completedBranchId).toBe("sell");
    expect(w.flags[FlagId.parse("flag.sold_drive")]).toBe(true);
    expect(w.reputation[FactionId.parse("faction.ashfall_syndicate")]).toBe(12);
  });
});
