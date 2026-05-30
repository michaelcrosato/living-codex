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
  exits: [
    { at: { x: 0, y: 0 }, toLocationId: "location.start", spawnAt: { x: 1, y: 1 }, label: "loop" },
  ],
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
    branches: [
      { id: "b", label: "l", objectives: [{ kind: "reach", locationId: "location.start" }] },
    ],
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
        quest({
          branches: [{ id: "b", label: "l", objectives: [{ kind: "defeat", npcId: "npc.ghost" }] }],
        }),
      ],
    });
    expect(errors.some((e) => e.includes("no branch is solvable"))).toBe(true);
  });

  it("flags a defeat objective whose target NPC has no combat stats (unwinnable, SPEC-72)", () => {
    const { errors } = check({
      npcs: [
        {
          id: "npc.pacifist",
          name: "P",
          appearance: { bodyColor: "#000", accentColor: "#fff", silhouette: "humanoid" },
          bio: { role: "r", backstory: "b", wants: "w", fears: "f", voice: "v" },
          dialogueId: "dialogue.d",
          homeLocationId: "location.start",
        },
      ],
      dialogues: [
        {
          id: "dialogue.d",
          format: "ink-json",
          inkVersion: "21",
          sourceHash: "x",
          compiled: {},
          declaredVars: [],
        },
      ],
      quests: [
        quest({
          giverNpcId: "npc.pacifist",
          branches: [
            { id: "fight", label: "f", objectives: [{ kind: "defeat", npcId: "npc.pacifist" }] },
          ],
        }),
      ],
    });
    expect(errors.some((e) => e.includes('defeat target "npc.pacifist" has no combat stats'))).toBe(
      true,
    );
  });

  it("does NOT flag a defeat objective whose target carries combat stats", () => {
    const { errors } = check({
      npcs: [
        {
          id: "npc.bruiser",
          name: "B",
          appearance: { bodyColor: "#000", accentColor: "#fff", silhouette: "humanoid" },
          bio: { role: "r", backstory: "b", wants: "w", fears: "f", voice: "v" },
          dialogueId: "dialogue.d",
          homeLocationId: "location.start",
          combat: { hp: 10 },
        },
      ],
      dialogues: [
        {
          id: "dialogue.d",
          format: "ink-json",
          inkVersion: "21",
          sourceHash: "x",
          compiled: {},
          declaredVars: [],
        },
      ],
      quests: [
        quest({
          giverNpcId: "npc.bruiser",
          branches: [
            { id: "fight", label: "f", objectives: [{ kind: "defeat", npcId: "npc.bruiser" }] },
          ],
        }),
      ],
    });
    expect(errors.filter((e) => e.includes("no combat stats"))).toEqual([]);
    expect(errors.filter((e) => e.includes("no branch is solvable"))).toEqual([]);
  });

  it("flags an unlock_exit whose index is out of range for the target location", () => {
    const { errors } = check({
      quests: [
        quest({
          onAnyComplete: [{ kind: "unlock_exit", locationId: "location.start", exitIndex: 5 }],
        }),
      ],
    });
    expect(errors.some((e) => e.includes("unlock_exit index 5 out of range"))).toBe(true);
  });

  it("flags a reach target that is an island (no exits in or out)", () => {
    const { errors } = check({
      locations: [baseLocation, islandLocation],
      quests: [
        quest({
          branches: [
            { id: "b", label: "l", objectives: [{ kind: "reach", locationId: "location.island" }] },
          ],
        }),
      ],
    });
    expect(errors.some((e) => e.includes('reach target "location.island" is an island'))).toBe(
      true,
    );
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
        {
          id: "storylet.noise",
          preconditions: [],
          salience: 0,
          tags: [],
          content: { ambient: "hush" },
          effects: [],
        },
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
    expect(
      warnings.some((w) => w.includes("dialogue.orphan") && w.includes("orphaned dialogue")),
    ).toBe(true);
    expect(warnings.some((w) => w.includes("dialogue.used"))).toBe(false); // the referenced one is fine
  });

  // SPEC-60 — unspawnable-NPC hygiene: an NPC with no home and in no npcSpawns can never be reached.
  it("warns (non-fatal) on an unspawnable NPC — no homeLocationId and in no npcSpawns", () => {
    const { errors, warnings } = check({
      npcs: [npc({ dialogueId: "dialogue.used" })], // no homeLocationId; baseLocation has empty npcSpawns
      dialogues: [dialogue("dialogue.used")],
    });
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes("npc.t") && w.includes("unspawnable NPC"))).toBe(true);
  });

  it("does NOT warn on an NPC that has a homeLocationId", () => {
    const { warnings } = check({
      npcs: [npc({ homeLocationId: "location.start" })],
      dialogues: [dialogue("dialogue.used")],
    });
    expect(warnings.filter((w) => w.includes("unspawnable NPC"))).toEqual([]);
  });

  // SPEC-68 — branch-shadowing: a multi-branch quest branch that is all talk_to-the-giver auto-completes.
  it("warns on a multi-branch quest branch whose objectives are all talk_to the giver", () => {
    const { errors, warnings } = check({
      npcs: [npc({ homeLocationId: "location.start" })],
      dialogues: [dialogue("dialogue.used")],
      quests: [
        quest({
          giverNpcId: "npc.t",
          branches: [
            {
              id: "gated",
              label: "g",
              objectives: [{ kind: "skill_check", skill: "force", dc: 10 }],
            },
            { id: "shadow", label: "s", objectives: [{ kind: "talk_to", npcId: "npc.t" }] }, // talk_to the GIVER
          ],
        }),
      ],
    });
    expect(errors).toEqual([]);
    expect(
      warnings.some(
        (w) =>
          w.includes("quest.t.branches.shadow") &&
          w.includes("auto-completes when the offer is taken"),
      ),
    ).toBe(true);
    expect(warnings.some((w) => w.includes("branches.gated"))).toBe(false);
  });

  it("does NOT warn on a talk_to to a NON-giver NPC (a legitimate choice mechanic — the market_debt shape)", () => {
    const { warnings } = check({
      npcs: [
        npc({ id: "npc.giver", dialogueId: "dialogue.used", homeLocationId: "location.start" }),
      ],
      dialogues: [dialogue("dialogue.used")],
      quests: [
        quest({
          giverNpcId: "npc.giver",
          branches: [
            { id: "talk", label: "t", objectives: [{ kind: "talk_to", npcId: "npc.other" }] }, // a DIFFERENT npc
            {
              id: "muscle",
              label: "m",
              objectives: [{ kind: "skill_check", skill: "force", dc: 10 }],
            },
          ],
        }),
      ],
    });
    expect(warnings.filter((w) => w.includes("auto-completes when the offer is taken"))).toEqual(
      [],
    );
  });

  it("does NOT warn when every branch has a player-gated objective", () => {
    const { warnings } = check({
      quests: [
        quest({
          giverNpcId: "npc.t",
          branches: [
            { id: "a", label: "a", objectives: [{ kind: "reach", locationId: "location.start" }] },
            { id: "b", label: "b", objectives: [{ kind: "skill_check", skill: "sneak", dc: 12 }] },
          ],
        }),
      ],
    });
    expect(warnings.filter((w) => w.includes("auto-completes when the offer is taken"))).toEqual(
      [],
    );
  });

  it("does NOT warn on a single-branch talk_to-giver quest (no siblings to shadow)", () => {
    const { warnings } = check({
      npcs: [npc({ homeLocationId: "location.start" })],
      dialogues: [dialogue("dialogue.used")],
      quests: [
        quest({
          giverNpcId: "npc.t",
          branches: [{ id: "only", label: "o", objectives: [{ kind: "talk_to", npcId: "npc.t" }] }],
        }),
      ],
    });
    expect(warnings.filter((w) => w.includes("auto-completes when the offer is taken"))).toEqual(
      [],
    );
  });

  // SPEC-70 — unsatisfiable flag gate: a flag_is gate reading a flag nothing sets can never trigger.
  it("warns when a flag_is gate reads a flag that no effect / declaredVar sets", () => {
    const { errors, warnings } = check({
      npcs: [npc({ homeLocationId: "location.start" })],
      dialogues: [dialogue("dialogue.used")],
      quests: [quest({ offerWhen: [{ kind: "flag_is", flag: "flag.never_set", equals: true }] })],
    });
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes("flag.never_set") && w.includes("set by nothing"))).toBe(
      true,
    );
  });

  it("does NOT warn when the gated flag is set by a set_flag effect", () => {
    const { warnings } = check({
      npcs: [npc({ homeLocationId: "location.start" })],
      dialogues: [dialogue("dialogue.used")],
      quests: [
        quest({
          id: "quest.setter",
          offerWhen: [],
          onAnyComplete: [{ kind: "set_flag", flag: "flag.x", to: true }],
        }),
        quest({
          id: "quest.reader",
          giverNpcId: "npc.t",
          offerWhen: [{ kind: "flag_is", flag: "flag.x", equals: true }],
        }),
      ],
    });
    expect(warnings.filter((w) => w.includes("set by nothing"))).toEqual([]);
  });

  it("does NOT warn when the gated flag is set by an Ink declaredVar (mirrored to flag.<var>)", () => {
    const dlg = { ...dialogue("dialogue.met"), declaredVars: ["met_x"] };
    const { warnings } = check({
      npcs: [npc({ dialogueId: "dialogue.met", homeLocationId: "location.start" })],
      dialogues: [dlg],
      quests: [quest({ offerWhen: [{ kind: "flag_is", flag: "flag.met_x", equals: true }] })],
    });
    expect(warnings.filter((w) => w.includes("set by nothing"))).toEqual([]);
  });

  it("does NOT warn on an NPC placed via a location's npcSpawns", () => {
    const spawnLoc = { ...baseLocation, npcSpawns: [{ npcId: "npc.t", at: { x: 1, y: 1 } }] };
    const { warnings } = check({
      locations: [spawnLoc],
      npcs: [npc({})], // no homeLocationId, but listed in npcSpawns
      dialogues: [dialogue("dialogue.used")],
    });
    expect(warnings.filter((w) => w.includes("unspawnable NPC"))).toEqual([]);
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
        {
          id: "storylet.s",
          preconditions: [{ kind: "flag_is", flag: "flag.y", equals: true }],
          salience: 1,
          tags: [],
          content: { dialogueId: "dialogue.storylet" },
          effects: [],
        },
      ],
      quests: [
        quest({
          onAnyComplete: [
            { kind: "set_npc_dialogue", npcId: "npc.t", dialogueId: "dialogue.effect" },
          ],
        }),
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
