import { describe, it, expect } from "vitest";
import type { Effect } from "@codex/content-schema";
import {
  FlagId,
  FactionId,
  ItemId,
  QuestId,
  LocationId,
  NpcId,
  DialogueId,
} from "@codex/content-schema";
import { effectToEvent, effectsToEvents } from "./effects";

describe("effectToEvent (the SCHEMA §5 1:1 seam)", () => {
  it("maps each supported effect to its engine event", () => {
    expect(effectToEvent({ kind: "set_flag", flag: FlagId.parse("flag.a"), to: true })).toEqual({
      type: "SetFlag",
      flag: "flag.a",
      to: true,
    });
    expect(
      effectToEvent({
        kind: "adjust_reputation",
        factionId: FactionId.parse("faction.x"),
        delta: -15,
      }),
    ).toEqual({ type: "AdjustReputation", factionId: "faction.x", delta: -15 });
    expect(
      effectToEvent({ kind: "give_item", itemId: ItemId.parse("item.drive"), count: 1 }),
    ).toEqual({
      type: "GiveItem",
      itemId: "item.drive",
      count: 1,
    });
    expect(effectToEvent({ kind: "modify_skill", skill: "persuade", delta: 2 })).toEqual({
      type: "ModifySkill",
      skill: "persuade",
      delta: 2,
    });
    expect(effectToEvent({ kind: "start_quest", questId: QuestId.parse("quest.q") })).toEqual({
      type: "StartQuest",
      questId: "quest.q",
    });
    expect(effectToEvent({ kind: "show_text", text: "hi" })).toEqual({
      type: "ShowText",
      text: "hi",
    });
  });

  it("maps a list", () => {
    const effects: Effect[] = [
      { kind: "set_flag", flag: FlagId.parse("flag.a"), to: 1 },
      { kind: "show_text", text: "x" },
    ];
    expect(effectsToEvents(effects)).toHaveLength(2);
  });

  it("maps unlock_exit and set_npc_dialogue (S1.2)", () => {
    expect(
      effectToEvent({
        kind: "unlock_exit",
        locationId: LocationId.parse("location.x"),
        exitIndex: 2,
      }),
    ).toEqual({ type: "UnlockExit", locationId: "location.x", exitIndex: 2 });
    expect(
      effectToEvent({
        kind: "set_npc_dialogue",
        npcId: NpcId.parse("npc.varga"),
        dialogueId: DialogueId.parse("dialogue.alt"),
      }),
    ).toEqual({ type: "SetNpcDialogue", npcId: "npc.varga", dialogueId: "dialogue.alt" });
  });
});
