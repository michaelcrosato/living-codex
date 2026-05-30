import { describe, it, expect } from "vitest";
import type { Condition } from "@codex/content-schema";
import { FlagId, FactionId, ItemId, LocationId, QuestId, SkillName } from "@codex/content-schema";
import { createWorld, SKILLS, type World, type QuestRuntimeState } from "../state/world";
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
    expect(evaluate(w, { kind: "quest_completed", questId: QuestId.parse("quest.other") })).toBe(
      false,
    );
  });

  // SPEC-111: credits_at_least was entirely untested (a whole condition kind). Cover the boundary with
  // credits present and the `?? 0` default on an empty inventory.
  it("credits_at_least", () => {
    const credits = ItemId.parse("item.credits");
    const wc = applyEvent(createWorld({ seed: "s", startLocationId: START }), {
      type: "GiveItem",
      itemId: credits,
      count: 100,
    });
    expect(evaluate(wc, { kind: "credits_at_least", amount: 100 })).toBe(true);
    expect(evaluate(wc, { kind: "credits_at_least", amount: 101 })).toBe(false);
    // empty inventory → `?? 0`: amount 0 is satisfiable, amount 1 is not.
    const w0 = createWorld({ seed: "s", startLocationId: START });
    expect(evaluate(w0, { kind: "credits_at_least", amount: 0 })).toBe(true);
    expect(evaluate(w0, { kind: "credits_at_least", amount: 1 })).toBe(false);
  });

  // SPEC-111: the `?? 0` defaults for an unmet faction / absent item. The negative-threshold case on an
  // unmet faction is the genuine correctness behavior the `?? 0` provides (without it, undefined >= -5
  // would be false). w0 has no factions/items.
  it("reputation_at_least and has_item default to 0 for an unmet faction / absent item", () => {
    const w0 = createWorld({ seed: "s", startLocationId: START });
    const unmet = FactionId.parse("faction.unmet");
    expect(evaluate(w0, { kind: "reputation_at_least", factionId: unmet, value: 0 })).toBe(true);
    expect(evaluate(w0, { kind: "reputation_at_least", factionId: unmet, value: -5 })).toBe(true);
    expect(evaluate(w0, { kind: "reputation_at_least", factionId: unmet, value: 1 })).toBe(false);
    const absent = ItemId.parse("item.absent");
    expect(evaluate(w0, { kind: "has_item", itemId: absent, count: 1 })).toBe(false);
  });

  it("skill_at_least (passive check)", () => {
    const ws = createWorld({ seed: "s", startLocationId: START, skills: { persuade: 3 } });
    expect(evaluate(ws, { kind: "skill_at_least", skill: "persuade", value: 3 })).toBe(true);
    expect(evaluate(ws, { kind: "skill_at_least", skill: "persuade", value: 2 })).toBe(true);
    expect(evaluate(ws, { kind: "skill_at_least", skill: "persuade", value: 4 })).toBe(false);
    // an unset skill defaults to 0
    expect(evaluate(ws, { kind: "skill_at_least", skill: "sneak", value: 1 })).toBe(false);
    // composes under not/all/any
    expect(
      evaluate(ws, { kind: "not", of: { kind: "skill_at_least", skill: "force", value: 1 } }),
    ).toBe(true);
    expect(
      evaluate(ws, {
        kind: "all",
        of: [
          { kind: "skill_at_least", skill: "persuade", value: 3 },
          { kind: "flag_is", flag, equals: true },
        ],
      }),
    ).toBe(false); // ws has no flags set
  });

  it("engine SKILLS matches content-schema SkillName.options (single source of truth)", () => {
    expect([...SKILLS].sort()).toEqual([...SkillName.options].sort());
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
