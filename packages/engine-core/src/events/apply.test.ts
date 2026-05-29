import { describe, it, expect } from "vitest";
import { FactionId, ItemId, FlagId, LocationId, QuestId } from "@codex/content-schema";
import { createWorld } from "../state/world";
import { applyEvent } from "./apply";

const START = LocationId.parse("location.start");
const world0 = () => createWorld({ seed: "seed", startLocationId: START });

describe("applyEvent (the chokepoint)", () => {
  it("clamps reputation to [-100, 100]", () => {
    const faction = FactionId.parse("faction.syndicate");
    let w = applyEvent(world0(), { type: "AdjustReputation", factionId: faction, delta: 250 });
    expect(w.reputation[faction]).toBe(100);
    w = applyEvent(w, { type: "AdjustReputation", factionId: faction, delta: -500 });
    expect(w.reputation[faction]).toBe(-100);
  });

  it("forbids driving inventory below zero", () => {
    const item = ItemId.parse("item.credits");
    const w = applyEvent(world0(), { type: "GiveItem", itemId: item, count: 5 });
    expect(w.inventory[item]).toBe(5);
    const w2 = applyEvent(w, { type: "GiveItem", itemId: item, count: -3 });
    expect(w2.inventory[item]).toBe(2);
    expect(() => applyEvent(w2, { type: "GiveItem", itemId: item, count: -10 })).toThrowError(
      /below zero/,
    );
  });

  it("modify_skill adjusts the player's condition modifiers", () => {
    const w = applyEvent(world0(), { type: "ModifySkill", skill: "persuade", delta: 2 });
    expect(w.player.conditionMods.persuade).toBe(2);
    expect(w.player.skills.persuade).toBe(0);
  });

  it("EnterLocation moves the player entity and sets the current location", () => {
    const dest = LocationId.parse("location.drip");
    const w = applyEvent(world0(), { type: "EnterLocation", locationId: dest, spawnAt: { x: 5, y: 9 } });
    expect(w.locationId).toBe(dest);
    expect(w.entities["entity.player"]?.locationId).toBe(dest);
    expect(w.entities["entity.player"]?.pos).toEqual({ x: 5, y: 9 });
  });

  it("OfferQuest / StartQuest are idempotent and never downgrade an in-progress quest", () => {
    const quest = QuestId.parse("quest.the_warehouse");
    let w = applyEvent(world0(), { type: "StartQuest", questId: quest });
    expect(w.quests[quest]?.status).toBe("active");
    w = applyEvent(w, { type: "OfferQuest", questId: quest });
    expect(w.quests[quest]?.status).toBe("active");
  });

  it("is pure — it never mutates the input world", () => {
    const before = world0();
    const snapshot = JSON.stringify(before);
    applyEvent(before, { type: "SetFlag", flag: FlagId.parse("flag.x"), to: true });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});
