import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { LocationId, FlagId } from "@codex/content-schema";
import { InkNarrative } from "@codex/narrative-ink";
import { GameSession } from "../src/session";
import { DialogueController } from "../src/dialogue-controller";

const opening = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const { registries, fingerprint } = loadPacks([opening]);
const DISTRICT = LocationId.parse("location.ashfall_district");
const MET_VARGA = FlagId.parse("flag.met_varga");
const ACCEPTED = FlagId.parse("flag.accepted");

function freshSession(): GameSession {
  return new GameSession(registries, fingerprint, new InkNarrative(), {
    seed: "dlg",
    startLocationId: DISTRICT,
    startPos: { x: 150, y: 320 },
  });
}

describe("dialogue UI controller (S2.3)", () => {
  it("reads the current dialogue frame for an NPC from world state", () => {
    const session = freshSession();
    const controller = new DialogueController(registries, new InkNarrative());
    const open = controller.openFor(session.world, "npc.varga");
    expect(open).not.toBeNull();
    expect(open!.npcName).toBe("Varga");
    expect(open!.frame.text.toLowerCase()).toContain("warehouse");
    expect(open!.frame.choices.length).toBe(3);
  });

  it("a Choose advances the dialogue and mirrors story vars into flags (offering the quest)", () => {
    const session = freshSession();
    const controller = new DialogueController(registries, new InkNarrative());
    const open = controller.openFor(session.world, "npc.varga")!;

    session.step([{ type: "Choose", dialogueId: open.dialogueId, choiceIndex: 0 }]);

    expect(session.world.flags[MET_VARGA]).toBe(true);
    expect(session.world.flags[ACCEPTED]).toBe(true);
    // dialogue has reached its end -> the panel would close (no choices left)
    expect(controller.openFor(session.world, "npc.varga")!.frame.choices.length).toBe(0);
  });
});
