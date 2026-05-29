import { describe, it, expect } from "vitest";
import type { Condition } from "@codex/content-schema";
import { FlagId, FactionId, ItemId, LocationId, QuestId } from "@codex/content-schema";
import { createWorld, type World, type QuestRuntimeState } from "../state/world";
import { applyEvent } from "../events/apply";
import { evaluate, evaluateAll } from "./conditions";

const START = LocationId.parse("location.start");
const flag = FlagId.parse("flag.met_varga");
const faction = FactionId.parse("faction.varga_crew");
const item = ItemId.parse("item.encrypted_drive");
const quest = QuestId.parse("quest.the_warehouse");

function seeded(): World {
  let w = createWorld({ seed: "s", startLocationId: START });
  w = applyEvent(w, { type: "SetFlag", flag, to: true });
  w = applyEvent(w, { type: "AdjustReputation", factionId: faction, delta: 30 });
  w = applyEvent(w, { type: "GiveItem", itemId: item, count: 2 });
  const completed: QuestRuntimeState = {
    status: "completed",
    activeBranchIds: [],
    objectiveProgress: {},
    appliedEffectIds: [],
  };
  return { ...w, quests: { ...w.quests, [quest]: completed } };
}

describe("evaluate (condition language)", () => {
  const w = seeded();

  it("flag_is", () => {
    expect(evaluate(w, { kind: "flag_is", flag, equals: true })).toBe(true);
    expect(evaluate(w, { kind: "flag_is", flag, equals: false })).toBe(false);
  });

  it("reputation_at_least", () => {
    expect(evaluate(w, { kind: "reputation_at_least", factionId: faction, value: 30 })).toBe(true);
    expect(evaluate(w, { kind: "reputation_at_least", factionId: faction, value: 31 })).toBe(false);
  });

  it("has_item", () => {
    expect(evaluate(w, { kind: "has_item", itemId: item, count: 2 })).toBe(true);
    expect(evaluate(w, { kind: "has_item", itemId: item, count: 3 })).toBe(false);
  });

  it("quest_completed", () => {
    expect(evaluate(w, { kind: "quest_completed", questId: quest })).toBe(true);
    expect(
      evaluate(w, { kind: "quest_completed", questId: QuestId.parse("quest.other") }),
    ).toBe(false);
  });

  it("not / all / any (including nesting)", () => {
    const yes: Condition = { kind: "flag_is", flag, equals: true };
    const no: Condition = { kind: "has_item", itemId: item, count: 99 };
    expect(evaluate(w, { kind: "not", of: no })).toBe(true);
    expect(evaluate(w, { kind: "all", of: [yes, { kind: "not", of: no }] })).toBe(true);
    expect(evaluate(w, { kind: "all", of: [yes, no] })).toBe(false);
    expect(evaluate(w, { kind: "any", of: [no, yes] })).toBe(true);
    expect(
      evaluate(w, { kind: "any", of: [no, { kind: "all", of: [yes, { kind: "not", of: no }] }] }),
    ).toBe(true);
  });

  it("evaluateAll is vacuously true on an empty list", () => {
    expect(evaluateAll(w, [])).toBe(true);
    expect(evaluateAll(w, [{ kind: "flag_is", flag, equals: true }])).toBe(true);
  });
});
