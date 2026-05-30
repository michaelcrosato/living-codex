import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { LocationId, FlagId } from "@codex/content-schema";
import { createWorld, applyEvents, reactionsSystem, type GameEvent } from "@codex/engine-core";
import { InkNarrative } from "@codex/narrative-ink";
import { DialogueController } from "../src/dialogue-controller";

const opening = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const { registries } = loadPacks([opening]);
const DISTRICT = LocationId.parse("location.ashfall_district");
const controller = new DialogueController(registries, new InkNarrative());

/** Set the given flags, run the reactions system once, and read Varga's current line. */
function afterCompletion(flags: readonly string[]) {
  let world = createWorld({ seed: "s", startLocationId: DISTRICT });
  const sets: GameEvent[] = flags.map((flag) => ({
    type: "SetFlag",
    flag: FlagId.parse(flag),
    to: true,
  }));
  world = applyEvents(world, sets);
  world = applyEvents(world, reactionsSystem(registries.npcs)(world, 0));
  return { world, open: controller.openFor(world, "npc.varga")! };
}

describe("reactive payoff: Varga's follow-up changes by how you got in (S2.4)", () => {
  it("talk -> the peaceful follow-up", () => {
    const { open } = afterCompletion(["flag.has_drive", "flag.entered_peacefully"]);
    expect(open.dialogueId).toBe("dialogue.varga_peace");
    expect(open.frame.text.toLowerCase()).toContain("smoother");
  });

  it("sneak -> the unseen follow-up", () => {
    const { open } = afterCompletion(["flag.has_drive", "flag.entered_unseen"]);
    expect(open.dialogueId).toBe("dialogue.varga_sneak");
    expect(open.frame.text.toLowerCase()).toContain("ghost");
  });

  it("force -> the 'marked' follow-up + a persistent consequence flag", () => {
    const { world, open } = afterCompletion(["flag.has_drive"]);
    expect(open.dialogueId).toBe("dialogue.varga_force");
    expect(open.frame.text.toLowerCase()).toContain("marked");
    expect(world.flags[FlagId.parse("flag.syndicate_marked")]).toBe(true);
  });

  it("before the quest is done, Varga gives the intro", () => {
    const world = createWorld({ seed: "s", startLocationId: DISTRICT });
    expect(controller.openFor(world, "npc.varga")!.dialogueId).toBe("dialogue.varga_intro");
  });

  // SPEC-52: selling the drive to the Syndicate (SPEC-50) is a betrayal Varga remembers.
  it("sold the drive to the Syndicate -> the betrayed follow-up + a persistent consequence flag", () => {
    const { world, open } = afterCompletion(["flag.has_drive", "flag.sold_drive"]);
    expect(open.dialogueId).toBe("dialogue.varga_betrayed");
    expect(open.frame.text.toLowerCase()).toContain("sold it");
    expect(world.flags[FlagId.parse("flag.varga_knows_betrayal")]).toBe(true);
  });

  it("the betrayal override wins over the entry-method follow-up (reaction ordering)", () => {
    // entered peacefully AND later sold the drive: the more recent betrayal beat dominates
    const { open } = afterCompletion([
      "flag.has_drive",
      "flag.entered_peacefully",
      "flag.sold_drive",
    ]);
    expect(open.dialogueId).toBe("dialogue.varga_betrayed");
  });
});
