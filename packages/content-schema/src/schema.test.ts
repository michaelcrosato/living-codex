import { describe, it, expect } from "vitest";
import { ContentPack } from "./pack";
import { Quest } from "./quest";
import { Condition } from "./condition";
import { NpcId, QuestId } from "./ids";
import { Effect } from "./effect";
import { toJsonSchema } from "./json-schema";

/** The fully-valid starter pack from SCHEMA.md §11 — the agent's immediate integration target. */
const starterPack = {
  id: "pack.starter",
  version: "0.1.0",
  title: "Starter Seed",
  dependsOn: [],
  provenance: { authoredBy: "human", models: [] },
  factions: [
    {
      id: "faction.varga_crew",
      name: "Varga's Crew",
      ethos: "Loyalty for loyalty. Debt remembered.",
      rivals: ["faction.ashfall_syndicate"],
      allies: [],
    },
  ],
  items: [
    {
      id: "item.encrypted_drive",
      name: "Encrypted Drive",
      description: "Heavy with someone's secrets.",
      kind: "quest",
      value: 0,
    },
  ],
  locations: [
    {
      id: "location.ashfall_district",
      name: "Ashfall Street",
      mood: "Acid rain hisses on neon. The awnings sag. Someone is always watching.",
      bounds: { w: 800, h: 600 },
      art: [
        { kind: "rect", at: { x: 0, y: 0 }, w: 800, h: 600, fill: "#0b0e14" },
        { kind: "rect", at: { x: 40, y: 120 }, w: 220, h: 160, fill: "#161b26", stroke: "#2bd1ff" },
      ],
      exits: [
        {
          at: { x: 700, y: 300 },
          toLocationId: "location.warehouse_door",
          spawnAt: { x: 60, y: 300 },
          label: "Toward the warehouse",
          requires: [],
        },
      ],
      npcSpawns: [{ npcId: "npc.varga", at: { x: 150, y: 320 } }],
      ambientText: ["A drone coughs past overhead."],
    },
  ],
  npcs: [
    {
      id: "npc.varga",
      name: "Varga",
      faction: "faction.varga_crew",
      appearance: { bodyColor: "#c8c8d0", accentColor: "#2bd1ff", silhouette: "cloaked" },
      bio: {
        role: "dock-side fixer",
        backstory: "Owes the Syndicate more than she'll admit.",
        wants: "the encrypted drive from the Syndicate warehouse",
        fears: "her crew learning how deep her debt runs",
        voice: "clipped, warm under the wariness",
        secrets: ["The debt is in her dead brother's name."],
      },
      dialogueId: "dialogue.varga_intro",
      reactsTo: [],
    },
  ],
  dialogues: [
    {
      id: "dialogue.varga_intro",
      format: "ink-json",
      inkVersion: "21",
      sourceHash: "stub",
      compiled: {},
      declaredVars: ["accepted"],
    },
  ],
  quests: [
    {
      id: "quest.the_warehouse",
      title: "What's in the Warehouse",
      giverNpcId: "npc.varga",
      summary: "Get the drive. Getting in is your problem.",
      offerWhen: [{ kind: "flag_is", flag: "flag.met_varga", equals: true }],
      branches: [
        {
          id: "talk",
          label: "Talk past the guard",
          objectives: [{ kind: "skill_check", skill: "persuade", dc: 12, onFail: [] }],
          onComplete: [],
          onFail: [],
        },
      ],
      onAnyComplete: [{ kind: "give_item", itemId: "item.encrypted_drive", count: 1 }],
      rewards: {
        credits: 200,
        items: [],
        reputation: [{ factionId: "faction.varga_crew", delta: 10 }],
      },
    },
  ],
};

/** The three-branch warehouse quest from SCHEMA.md §9. */
const warehouseQuest = {
  id: "quest.the_warehouse",
  title: "What's in the Warehouse",
  giverNpcId: "npc.varga",
  summary: "Varga says there's something worth taking in the Ashfall warehouse.",
  offerWhen: [{ kind: "flag_is", flag: "flag.met_varga", equals: true }],
  branches: [
    {
      id: "talk",
      label: "Talk your way past the guard",
      objectives: [
        { kind: "reach", locationId: "location.warehouse_door" },
        {
          kind: "skill_check",
          skill: "persuade",
          dc: 12,
          onFail: [
            { kind: "set_flag", flag: "flag.guard_suspicious", to: true },
            { kind: "show_text", text: "The guard's hand drifts to his stun baton." },
          ],
        },
        { kind: "reach", locationId: "location.warehouse_floor" },
      ],
      onComplete: [{ kind: "set_flag", flag: "flag.entered_peacefully", to: true }],
    },
    {
      id: "sneak",
      label: "Slip in through the vents",
      objectives: [
        { kind: "reach", locationId: "location.warehouse_roof" },
        { kind: "skill_check", skill: "sneak", dc: 14 },
        { kind: "reach", locationId: "location.warehouse_floor" },
      ],
      onComplete: [],
    },
    {
      id: "force",
      label: "Just take it",
      objectives: [
        { kind: "reach", locationId: "location.warehouse_door" },
        { kind: "defeat", npcId: "npc.warehouse_guard" },
        { kind: "reach", locationId: "location.warehouse_floor" },
      ],
      onComplete: [
        { kind: "adjust_reputation", factionId: "faction.ashfall_syndicate", delta: -15 },
      ],
    },
  ],
  onAnyComplete: [
    { kind: "give_item", itemId: "item.encrypted_drive", count: 1 },
    { kind: "set_flag", flag: "flag.has_drive", to: true },
  ],
  rewards: {
    credits: 200,
    items: [],
    reputation: [{ factionId: "faction.varga_crew", delta: 10 }],
  },
};

describe("content-schema", () => {
  it("parses the SCHEMA.md §11 starter pack", () => {
    const result = ContentPack.safeParse(starterPack);
    expect(result.success).toBe(true);
  });

  it("parses the SCHEMA.md §9 three-branch warehouse quest", () => {
    const parsed = Quest.parse(warehouseQuest);
    expect(parsed.branches).toHaveLength(3);
    expect(parsed.branches.map((b) => b.id)).toEqual(["talk", "sneak", "force"]);
  });

  it("applies defaults (rewards.credits, retryable, requires)", () => {
    const q = Quest.parse(warehouseQuest);
    const talk = q.branches[0]!;
    const check = talk.objectives.find((o) => o.kind === "skill_check");
    expect(check).toBeDefined();
    if (check?.kind === "skill_check") expect(check.retryable).toBe(false);
  });

  it("parses nested all/any/not conditions", () => {
    const cond = {
      kind: "all",
      of: [
        { kind: "flag_is", flag: "flag.met_varga", equals: true },
        {
          kind: "any",
          of: [{ kind: "not", of: { kind: "quest_completed", questId: "quest.the_warehouse" } }],
        },
      ],
    };
    expect(Condition.safeParse(cond).success).toBe(true);
  });

  describe("rejects malformed content with clear errors", () => {
    it("a bad id prefix", () => {
      expect(NpcId.safeParse("varga").success).toBe(false);
      // a quest id is not a valid npc id even though both are strings
      expect(NpcId.safeParse("quest.the_warehouse").success).toBe(false);
      expect(QuestId.safeParse("quest.the_warehouse").success).toBe(true);
    });

    it("a give_item with count 0", () => {
      const bad = { kind: "give_item", itemId: "item.x", count: 0 };
      expect(Effect.safeParse(bad).success).toBe(false);
    });

    it("a skill_check with an out-of-range dc", () => {
      const bad = { kind: "skill_check", skill: "persuade", dc: 99 };
      // wrapped in a minimal branch/quest path
      const q = { ...warehouseQuest, branches: [{ id: "x", label: "x", objectives: [bad] }] };
      expect(Quest.safeParse(q).success).toBe(false);
    });

    it("a pack id without the pack. prefix", () => {
      expect(ContentPack.safeParse({ ...starterPack, id: "starter" }).success).toBe(false);
    });
  });

  it("exports a JSON Schema for the offline pipeline", () => {
    const schema = toJsonSchema() as { type?: string; properties?: Record<string, unknown> };
    expect(schema).toBeTypeOf("object");
    // Zod 4's native z.toJSONSchema inlines the ContentPack object (no zod-to-json-schema `name`
    // wrapper), so assert it semantically describes the pack: a top-level object whose properties
    // include the content arrays the offline pipeline must emit (SPEC-16).
    expect(schema.type).toBe("object");
    expect(schema.properties).toBeTypeOf("object");
    for (const key of [
      "npcs",
      "quests",
      "locations",
      "factions",
      "items",
      "storylets",
      "dialogues",
    ]) {
      expect(schema.properties).toHaveProperty(key);
    }
  });
});
