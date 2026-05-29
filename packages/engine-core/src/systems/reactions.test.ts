import { describe, it, expect } from "vitest";
import { Npc, NpcId, FlagId, DialogueId, LocationId } from "@codex/content-schema";
import { createWorld, type World } from "../state/world";
import { applyEvents } from "../events/apply";
import { reactionsSystem } from "./reactions";

const START = LocationId.parse("location.start");
const VARGA = NpcId.parse("npc.varga");
const HAS_DRIVE = FlagId.parse("flag.has_drive");
const VARGA_PLEASED = FlagId.parse("flag.varga_pleased");
const ALT = DialogueId.parse("dialogue.varga_followup");

/** Varga reacts once the player has the drive: sets a flag + swaps to a follow-up dialogue. */
const varga = Npc.parse({
  id: "npc.varga",
  name: "Varga",
  appearance: { bodyColor: "#fff", accentColor: "#000", silhouette: "cloaked" },
  bio: { role: "fixer", backstory: "b", wants: "w", fears: "f", voice: "v" },
  dialogueId: "dialogue.varga_intro",
  reactsTo: [
    {
      when: [{ kind: "flag_is", flag: "flag.has_drive", equals: true }],
      setsFlags: [{ kind: "set_flag", flag: "flag.varga_pleased", to: true }],
      overrideDialogueId: "dialogue.varga_followup",
    },
  ],
});
const npcs = new Map([[VARGA, varga]]);

const world0 = (): World => createWorld({ seed: "s", startLocationId: START });

describe("reactions system (the world remembers)", () => {
  it("does nothing while the reaction's conditions are unmet", () => {
    expect(reactionsSystem(npcs)(world0(), 0)).toEqual([]);
  });

  it("fires when conditions hold: sets flags and overrides the NPC's dialogue", () => {
    const w = applyEvents(world0(), [{ type: "SetFlag", flag: HAS_DRIVE, to: true }]);
    const events = reactionsSystem(npcs)(w, 0);
    expect(events).toContainEqual({ type: "SetFlag", flag: VARGA_PLEASED, to: true });
    expect(events).toContainEqual({ type: "SetNpcDialogue", npcId: VARGA, dialogueId: ALT });

    const after = applyEvents(w, events);
    expect(after.flags[VARGA_PLEASED]).toBe(true);
    expect(after.npcDialogue[VARGA]).toBe(ALT);
  });

  it("is idempotent: once applied it emits nothing (no log spam, no oscillation)", () => {
    let w = applyEvents(world0(), [{ type: "SetFlag", flag: HAS_DRIVE, to: true }]);
    w = applyEvents(w, reactionsSystem(npcs)(w, 0));
    expect(reactionsSystem(npcs)(w, 0)).toEqual([]);
  });
});
