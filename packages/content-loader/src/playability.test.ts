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

  // SPEC-104: a `retrieve` objective on an item nothing grants is unwinnable (the engine only adds items
  // via give_item / quest rewards; starting inventory is empty). Warning-only (extrinsic, subset-safe).
  describe("retrieve item-source guard (SPEC-104)", () => {
    const retrieveQuest = (over: Record<string, unknown> = {}) =>
      quest({
        branches: [
          {
            id: "b",
            label: "l",
            objectives: [{ kind: "retrieve", itemId: "item.cell", count: 2 }],
          },
        ],
        ...over,
      });
    const isUnobtainable = (w: string) =>
      w.includes('retrieve target "item.cell"') && w.includes("granted by no give_item");

    it("warns when the retrieve item is granted by nothing", () => {
      const { errors, warnings } = check({ quests: [retrieveQuest()] });
      expect(errors).toEqual([]);
      expect(warnings.some(isUnobtainable)).toBe(true);
    });

    it("no warning when a branch onComplete give_item grants the item", () => {
      const { errors, warnings } = check({
        quests: [
          retrieveQuest({
            branches: [
              {
                id: "b",
                label: "l",
                objectives: [{ kind: "retrieve", itemId: "item.cell", count: 2 }],
                onComplete: [{ kind: "give_item", itemId: "item.cell", count: 1 }],
              },
            ],
          }),
        ],
      });
      expect(errors).toEqual([]);
      expect(warnings.some(isUnobtainable)).toBe(false);
    });

    it("no warning when a storylet effect grants the item", () => {
      const { errors, warnings } = check({
        quests: [retrieveQuest()],
        storylets: [
          {
            id: "storylet.drop",
            preconditions: [{ kind: "flag_is", flag: "flag.x", equals: true }],
            salience: 1,
            tags: [],
            content: { ambient: "a cell" },
            effects: [{ kind: "give_item", itemId: "item.cell", count: 1 }],
          },
        ],
      });
      expect(errors).toEqual([]);
      expect(warnings.some(isUnobtainable)).toBe(false);
    });

    it("no warning when rewards.items grants the item", () => {
      const { errors, warnings } = check({
        quests: [retrieveQuest({ rewards: { items: [{ itemId: "item.cell", count: 1 }] } })],
      });
      expect(errors).toEqual([]);
      expect(warnings.some(isUnobtainable)).toBe(false);
    });

    it("no warning for retrieve item.credits when a quest awards credits", () => {
      const { errors, warnings } = check({
        quests: [
          retrieveQuest({
            branches: [
              {
                id: "b",
                label: "l",
                objectives: [{ kind: "retrieve", itemId: "item.credits", count: 5 }],
              },
            ],
            rewards: { credits: 100 },
          }),
        ],
      });
      expect(errors).toEqual([]);
      expect(warnings.some((w) => w.includes('retrieve target "item.credits"'))).toBe(false);
    });

    // SPEC-106: the `rewards.credits > 0` boundary mirrors the engine's credit-grant (quests.ts:27) —
    // credits=0 grants no item.credits, so a retrieve item.credits is unobtainable. (Kills the >0→>=0 mutant.)
    it("warns for retrieve item.credits when no quest awards credits", () => {
      const { errors, warnings } = check({
        quests: [
          retrieveQuest({
            branches: [
              {
                id: "b",
                label: "l",
                objectives: [{ kind: "retrieve", itemId: "item.credits", count: 5 }],
              },
            ],
            rewards: { credits: 0 },
          }),
        ],
      });
      expect(errors).toEqual([]);
      expect(warnings.some((w) => w.includes('retrieve target "item.credits"'))).toBe(true);
    });

    // SPEC-106: a give_item inside a skill_check's onFail is a genuine item source. (Kills the :298 mutant
    // that deletes the skill_check.onFail collection.)
    it("no warning when the only item source is a give_item in a skill_check onFail", () => {
      const { errors, warnings } = check({
        quests: [
          retrieveQuest({
            branches: [
              {
                id: "b",
                label: "l",
                objectives: [
                  { kind: "retrieve", itemId: "item.cell", count: 1 },
                  {
                    kind: "skill_check",
                    skill: "tech",
                    dc: 10,
                    onFail: [{ kind: "give_item", itemId: "item.cell", count: 1 }],
                  },
                ],
              },
            ],
          }),
        ],
      });
      expect(errors).toEqual([]);
      expect(warnings.some(isUnobtainable)).toBe(false);
    });
  });

  // SPEC-105: a `has_item` gate on an item nothing grants is unsatisfiable (the item-analog of SPEC-70's
  // flag-gate check). Warning-only; reuses the SPEC-104 obtainable-item set across the four gate sites.
  describe("has_item gate guard (SPEC-105)", () => {
    const isUnsatItemGate = (w: string) =>
      w.includes('has_item gate "item.key"') && w.includes("granted by no give_item");

    it("warns on a has_item storylet precondition for an item nothing grants", () => {
      const { errors, warnings } = check({
        storylets: [
          {
            id: "storylet.locked",
            preconditions: [{ kind: "has_item", itemId: "item.key", count: 1 }],
            salience: 1,
            tags: [],
            content: { ambient: "a locked door" },
            effects: [],
          },
        ],
      });
      expect(errors).toEqual([]);
      expect(warnings.some(isUnsatItemGate)).toBe(true);
    });

    it("no warning when the gated item is granted by a give_item effect", () => {
      const { errors, warnings } = check({
        storylets: [
          {
            id: "storylet.locked",
            preconditions: [{ kind: "has_item", itemId: "item.key", count: 1 }],
            salience: 1,
            tags: [],
            content: { ambient: "a locked door" },
            effects: [{ kind: "give_item", itemId: "item.key", count: 1 }],
          },
        ],
      });
      expect(errors).toEqual([]);
      expect(warnings.some(isUnsatItemGate)).toBe(false);
    });

    it("recurses into a nested all/not gate in offerWhen", () => {
      const { errors, warnings } = check({
        quests: [
          quest({
            offerWhen: [
              {
                kind: "all",
                of: [{ kind: "not", of: { kind: "has_item", itemId: "item.key", count: 1 } }],
              },
            ],
          }),
        ],
      });
      expect(errors).toEqual([]);
      expect(warnings.some(isUnsatItemGate)).toBe(true);
    });

    // SPEC-106: recursion must also descend `any` gates (not just `all`). Kills the "all" || false mutant.
    it("recurses into an any gate in a storylet precondition", () => {
      const { errors, warnings } = check({
        storylets: [
          {
            id: "storylet.locked",
            preconditions: [
              { kind: "any", of: [{ kind: "has_item", itemId: "item.key", count: 1 }] },
            ],
            salience: 1,
            tags: [],
            content: { ambient: "a locked door" },
            effects: [],
          },
        ],
      });
      expect(errors).toEqual([]);
      expect(warnings.some(isUnsatItemGate)).toBe(true);
    });
  });
});
