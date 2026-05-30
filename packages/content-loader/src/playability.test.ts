import { describe, it, expect } from "vitest";
import { ContentPack } from "@codex/content-schema";
import { buildRegistries } from "./registries";
import { staticPlayabilityCheck } from "./playability";

// A connected, enterable base location (self-exit) so reach(location.start) is always reachable.
const baseLocation = {
  id: "location.start",
  name: "Start",
  mood: "m",
  bounds: { w: 10, h: 10 },
  art: [],
  exits: [{ at: { x: 0, y: 0 }, toLocationId: "location.start", spawnAt: { x: 1, y: 1 }, label: "loop" }],
  npcSpawns: [],
};
// An island: exists, but nothing exits to it and it has no exits out.
const islandLocation = {
  id: "location.island",
  name: "Island",
  mood: "m",
  bounds: { w: 10, h: 10 },
  art: [],
  exits: [],
  npcSpawns: [],
};

function quest(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "quest.t",
    title: "T",
    summary: "s",
    branches: [{ id: "b", label: "l", objectives: [{ kind: "reach", locationId: "location.start" }] }],
    rewards: {},
    ...over,
  };
}

function pack(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "pack.t",
    version: "1.0.0",
    title: "T",
    dependsOn: [],
    provenance: { authoredBy: "human" },
    locations: [baseLocation],
    ...over,
  };
}

/** Build registries from a schema-valid pack and run the playability pass. */
function check(over: Record<string, unknown>): { errors: string[]; warnings: string[] } {
  return staticPlayabilityCheck(buildRegistries([ContentPack.parse(pack(over))]));
}

describe("staticPlayabilityCheck (the schema-valid≠playable gate, SPEC-43)", () => {
  it("a solvable, reachable quest yields no errors or warnings", () => {
    const { errors, warnings } = check({ quests: [quest({})] });
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("flags a quest whose only branch is unsatisfiable (defeat a nonexistent npc)", () => {
    const { errors } = check({
      quests: [
        quest({ branches: [{ id: "b", label: "l", objectives: [{ kind: "defeat", npcId: "npc.ghost" }] }] }),
      ],
    });
    expect(errors.some((e) => e.includes("no branch is solvable"))).toBe(true);
  });

  it("flags an unlock_exit whose index is out of range for the target location", () => {
    const { errors } = check({
      quests: [
        quest({ onAnyComplete: [{ kind: "unlock_exit", locationId: "location.start", exitIndex: 5 }] }),
      ],
    });
    expect(errors.some((e) => e.includes("unlock_exit index 5 out of range"))).toBe(true);
  });

  it("flags a reach target that is an island (no exits in or out)", () => {
    const { errors } = check({
      locations: [baseLocation, islandLocation],
      quests: [
        quest({ branches: [{ id: "b", label: "l", objectives: [{ kind: "reach", locationId: "location.island" }] }] }),
      ],
    });
    expect(errors.some((e) => e.includes('reach target "location.island" is an island'))).toBe(true);
  });

  it("flags contradictory flag_is gates in offerWhen (the quest could never be offered)", () => {
    const { errors } = check({
      quests: [
        quest({
          offerWhen: [
            { kind: "flag_is", flag: "flag.a", equals: true },
            { kind: "flag_is", flag: "flag.a", equals: false },
          ],
        }),
      ],
    });
    expect(errors.some((e) => e.includes("contradictory flag_is"))).toBe(true);
  });

  it("warns (non-fatal) on an always-on storylet — no preconditions and salience 0", () => {
    const { errors, warnings } = check({
      storylets: [
        { id: "storylet.noise", preconditions: [], salience: 0, tags: [], content: { ambient: "hush" }, effects: [] },
      ],
    });
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes("always-on ambient noise"))).toBe(true);
  });

  // SPEC-53 — orphaned-dialogue hygiene: a dialogue referenced by nothing can never be shown.
  const dialogue = (id: string): Record<string, unknown> => ({
    id,
    format: "ink-json",
    inkVersion: "21",
    sourceHash: "x",
    compiled: {},
    declaredVars: [],
  });
  const npc = (over: Record<string, unknown>): Record<string, unknown> => ({
    id: "npc.t",
    name: "T",
    appearance: { bodyColor: "#000", accentColor: "#fff", silhouette: "humanoid" },
    bio: { role: "r", backstory: "b", wants: "w", fears: "f", voice: "v" },
    dialogueId: "dialogue.used",
    ...over,
  });

  it("warns (non-fatal) on an orphaned dialogue — defined but referenced by nothing", () => {
    const { errors, warnings } = check({
      npcs: [npc({})], // references dialogue.used
      dialogues: [dialogue("dialogue.used"), dialogue("dialogue.orphan")],
    });
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes("dialogue.orphan") && w.includes("orphaned dialogue"))).toBe(true);
    expect(warnings.some((w) => w.includes("dialogue.used"))).toBe(false); // the referenced one is fine
  });

  it("does NOT warn when every dialogue is reached via NPC / reaction / storylet / set_npc_dialogue", () => {
    const { errors, warnings } = check({
      npcs: [
        npc({
          reactsTo: [
            {
              when: [{ kind: "flag_is", flag: "flag.x", equals: true }],
              overrideDialogueId: "dialogue.reaction",
            },
          ],
        }),
      ],
      storylets: [
        { id: "storylet.s", preconditions: [{ kind: "flag_is", flag: "flag.y", equals: true }], salience: 1, tags: [], content: { dialogueId: "dialogue.storylet" }, effects: [] },
      ],
      quests: [
        quest({ onAnyComplete: [{ kind: "set_npc_dialogue", npcId: "npc.t", dialogueId: "dialogue.effect" }] }),
      ],
      dialogues: [
        dialogue("dialogue.used"), // npc.dialogueId
        dialogue("dialogue.reaction"), // reactsTo.overrideDialogueId
        dialogue("dialogue.storylet"), // storylet.content.dialogueId
        dialogue("dialogue.effect"), // set_npc_dialogue effect
      ],
    });
    expect(errors).toEqual([]);
    expect(warnings.filter((w) => w.includes("orphaned dialogue"))).toEqual([]);
  });
});
