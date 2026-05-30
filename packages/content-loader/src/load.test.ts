import { describe, it, expect } from "vitest";
import { loadPacks, orderByDependencies } from "./load";
import { validatePack } from "./validate";

/** A compact, fully valid, internally-consistent pack used as the base for variations. */
function validPack(): Record<string, unknown> {
  return {
    id: "pack.core",
    version: "1.0.0",
    title: "Core",
    dependsOn: [],
    provenance: { authoredBy: "human" },
    factions: [{ id: "faction.varga_crew", name: "Varga's Crew", ethos: "Debt remembered." }],
    items: [{ id: "item.encrypted_drive", name: "Drive", description: "Secrets.", kind: "quest" }],
    dialogues: [
      {
        id: "dialogue.varga_intro",
        format: "ink-json",
        inkVersion: "21",
        sourceHash: "x",
        compiled: {},
        declaredVars: [],
      },
    ],
    locations: [
      {
        id: "location.street",
        name: "Street",
        mood: "Rain on neon.",
        bounds: { w: 100, h: 100 },
        art: [],
        npcSpawns: [{ npcId: "npc.varga", at: { x: 1, y: 1 } }],
      },
    ],
    npcs: [
      {
        id: "npc.varga",
        name: "Varga",
        appearance: { bodyColor: "#fff", accentColor: "#000", silhouette: "cloaked" },
        bio: { role: "fixer", backstory: "b", wants: "w", fears: "f", voice: "v" },
        dialogueId: "dialogue.varga_intro",
      },
    ],
    quests: [
      {
        id: "quest.the_warehouse",
        title: "What's in the Warehouse",
        giverNpcId: "npc.varga",
        summary: "Get the drive.",
        offerWhen: [{ kind: "flag_is", flag: "flag.met_varga", equals: true }],
        branches: [
          {
            id: "talk",
            label: "Talk past the guard",
            objectives: [{ kind: "skill_check", skill: "persuade", dc: 12 }],
          },
        ],
        onAnyComplete: [{ kind: "give_item", itemId: "item.encrypted_drive", count: 1 }],
        rewards: { reputation: [{ factionId: "faction.varga_crew", delta: 10 }] },
      },
    ],
  };
}

describe("content-loader", () => {
  it("loads a valid pack into frozen, indexed registries", () => {
    const { registries, fingerprint } = loadPacks([validPack()]);
    expect(registries.npcs.size).toBe(1);
    expect([...registries.npcs.values()][0]?.name).toBe("Varga");
    expect(registries.quests.size).toBe(1);
    expect(fingerprint.packs).toEqual({ "pack.core": "1.0.0" });
    expect(fingerprint.registriesHash).toMatch(/^[0-9a-f]+$/);
    expect(Object.isFrozen(registries)).toBe(true);
  });

  it("fails loudly on a dangling reference with the id, path, and pack", () => {
    const broken = validPack();
    (broken.quests as { giverNpcId: string }[])[0]!.giverNpcId = "npc.ghost";
    expect(() => loadPacks([broken])).toThrowError(/npc\.ghost/);
    expect(() => loadPacks([broken])).toThrowError(/pack\.core/);
    expect(() => loadPacks([broken])).toThrowError(/giverNpcId/);
  });

  it("detects a dangling reference nested inside a condition", () => {
    const broken = validPack();
    (broken.quests as { offerWhen: unknown[] }[])[0]!.offerWhen = [
      { kind: "all", of: [{ kind: "quest_completed", questId: "quest.nonexistent" }] },
    ];
    expect(() => loadPacks([broken])).toThrowError(/quest\.nonexistent/);
  });

  it("rejects a duplicate pack id", () => {
    expect(() => loadPacks([validPack(), validPack()])).toThrowError(/Duplicate pack id/);
  });

  it("orders packs by dependsOn and rejects a missing dependency", () => {
    const a = { ...validPack(), id: "pack.a" };
    const b = {
      ...validPack(),
      id: "pack.b",
      dependsOn: ["pack.a"],
      // give b its own ids so there are no duplicates with a
      factions: [{ id: "faction.b", name: "B", ethos: "e" }],
      items: [],
      dialogues: [
        { id: "dialogue.b", format: "ink-json", inkVersion: "21", sourceHash: "x", compiled: {} },
      ],
      locations: [],
      npcs: [
        {
          id: "npc.b",
          name: "B",
          appearance: { bodyColor: "#1", accentColor: "#2", silhouette: "tall" },
          bio: { role: "r", backstory: "b", wants: "w", fears: "f", voice: "v" },
          dialogueId: "dialogue.b",
        },
      ],
      quests: [],
    };
    // provided out of order; should still order a before b
    const ordered = orderByDependencies([validatePack(b), validatePack(a)]);
    expect(ordered.map((p) => p.id)).toEqual(["pack.a", "pack.b"]);
    // missing dependency
    expect(() => loadPacks([b])).toThrowError(/depends on "pack\.a"/);
  });

  it("detects a dependency cycle", () => {
    const a = { ...validPack(), id: "pack.a", dependsOn: ["pack.b"] };
    const b = {
      ...validPack(),
      id: "pack.b",
      dependsOn: ["pack.a"],
      factions: [],
      items: [],
      dialogues: [],
      locations: [],
      npcs: [],
      quests: [],
    };
    expect(() => orderByDependencies([validatePack(a), validatePack(b)])).toThrowError(/cycle/i);
  });

  it("produces a stable, input-order-independent fingerprint", () => {
    const h1 = loadPacks([validPack()]).fingerprint.registriesHash;
    const h2 = loadPacks([validPack()]).fingerprint.registriesHash;
    expect(h1).toBe(h2);
  });

  it("catches a dangling reference for EVERY entity type (treaty completeness)", () => {
    // The integrity pass collects refs of types npc/quest/faction/item/location/dialogue across many
    // paths. Prior tests only covered npc + quest; these guard the other four type detectors so a
    // regression that stopped checking (say) faction or dialogue refs can't slip bad content through.

    // faction — via npc.faction
    const fac = validPack();
    (fac.npcs as { faction?: string }[])[0]!.faction = "faction.ghost";
    expect(() => loadPacks([fac])).toThrowError(/faction\.ghost/);

    // item — via quest rewards.items
    const itm = validPack();
    (itm.quests as { rewards: { items?: unknown[] } }[])[0]!.rewards.items = [
      { itemId: "item.ghost", count: 1 },
    ];
    expect(() => loadPacks([itm])).toThrowError(/item\.ghost/);

    // location — via npc.homeLocationId
    const loc = validPack();
    (loc.npcs as { homeLocationId?: string }[])[0]!.homeLocationId = "location.ghost";
    expect(() => loadPacks([loc])).toThrowError(/location\.ghost/);

    // dialogue — via npc.dialogueId
    const dlg = validPack();
    (dlg.npcs as { dialogueId: string }[])[0]!.dialogueId = "dialogue.ghost";
    expect(() => loadPacks([dlg])).toThrowError(/dialogue\.ghost/);
  });

  it("catches a dangling reference inside an EFFECT (give_item) — not just conditions/top-level fields", () => {
    // Effects route refs too (collectEffectRefs); prior tests only hit a condition + a top-level id.
    const broken = validPack();
    (broken.quests as { onAnyComplete: unknown[] }[])[0]!.onAnyComplete = [
      { kind: "give_item", itemId: "item.ghost", count: 1 },
    ];
    expect(() => loadPacks([broken])).toThrowError(/item\.ghost/);
  });

  it("catches dangling references across every collection PATH (the treaty is comprehensive)", () => {
    // integrity.ts routes refs through distinct collectors per source location; a regression in any
    // single arm must still fail the load. One dangling ref per path, each expected to throw its id.
    const cases: { name: string; ghost: RegExp; mut: (p: Record<string, unknown>) => void }[] = [
      {
        name: "condition has_item (offerWhen)",
        ghost: /item\.ghost/,
        mut: (p) =>
          ((p.quests as { offerWhen: unknown[] }[])[0]!.offerWhen = [
            { kind: "has_item", itemId: "item.ghost", count: 1 },
          ]),
      },
      {
        name: "effect adjust_reputation (onAnyComplete)",
        ghost: /faction\.ghost/,
        mut: (p) =>
          ((p.quests as { onAnyComplete: unknown[] }[])[0]!.onAnyComplete = [
            { kind: "adjust_reputation", factionId: "faction.ghost", delta: 5 },
          ]),
      },
      {
        name: "objective reach (location)",
        ghost: /location\.ghost/,
        mut: (p) =>
          ((p.quests as { branches: { objectives: unknown[] }[] }[])[0]!.branches[0]!.objectives = [
            { kind: "reach", locationId: "location.ghost" },
          ]),
      },
      {
        name: "location exit.toLocationId",
        ghost: /location\.ghost/,
        mut: (p) =>
          ((p.locations as { exits?: unknown[] }[])[0]!.exits = [
            {
              at: { x: 0, y: 0 },
              toLocationId: "location.ghost",
              spawnAt: { x: 0, y: 0 },
              label: "x",
            },
          ]),
      },
      {
        name: "location npcSpawns.npcId",
        ghost: /npc\.ghost/,
        mut: (p) =>
          ((p.locations as { npcSpawns: unknown[] }[])[0]!.npcSpawns = [
            { npcId: "npc.ghost", at: { x: 0, y: 0 } },
          ]),
      },
      {
        name: "faction.rivals",
        ghost: /faction\.ghost/,
        mut: (p) => ((p.factions as { rivals?: string[] }[])[0]!.rivals = ["faction.ghost"]),
      },
      {
        name: "faction.allies",
        ghost: /faction\.ghost/,
        mut: (p) => ((p.factions as { allies?: string[] }[])[0]!.allies = ["faction.ghost"]),
      },
      {
        name: "condition reputation_at_least (offerWhen)",
        ghost: /faction\.ghost/,
        mut: (p) =>
          ((p.quests as { offerWhen: unknown[] }[])[0]!.offerWhen = [
            { kind: "reputation_at_least", factionId: "faction.ghost", value: 1 },
          ]),
      },
      {
        name: "objective talk_to (npc)",
        ghost: /npc\.ghost/,
        mut: (p) =>
          ((p.quests as { branches: { objectives: unknown[] }[] }[])[0]!.branches[0]!.objectives = [
            { kind: "talk_to", npcId: "npc.ghost" },
          ]),
      },
      {
        name: "objective retrieve (item)",
        ghost: /item\.ghost/,
        mut: (p) =>
          ((p.quests as { branches: { objectives: unknown[] }[] }[])[0]!.branches[0]!.objectives = [
            { kind: "retrieve", itemId: "item.ghost", count: 1 },
          ]),
      },
      {
        name: "effect unlock_exit (location)",
        ghost: /location\.ghost/,
        mut: (p) =>
          ((p.quests as { onAnyComplete: unknown[] }[])[0]!.onAnyComplete = [
            { kind: "unlock_exit", locationId: "location.ghost", exitIndex: 0 },
          ]),
      },
      {
        name: "effect start_quest (quest)",
        ghost: /quest\.ghost/,
        mut: (p) =>
          ((p.quests as { onAnyComplete: unknown[] }[])[0]!.onAnyComplete = [
            { kind: "start_quest", questId: "quest.ghost" },
          ]),
      },
      {
        name: "effect set_npc_dialogue (npc)",
        ghost: /npc\.ghost/,
        mut: (p) =>
          ((p.quests as { onAnyComplete: unknown[] }[])[0]!.onAnyComplete = [
            { kind: "set_npc_dialogue", npcId: "npc.ghost", dialogueId: "dialogue.varga_intro" },
          ]),
      },
      {
        name: "effect bribe_faction (faction)",
        ghost: /faction\.ghost/,
        mut: (p) =>
          ((p.quests as { onAnyComplete: unknown[] }[])[0]!.onAnyComplete = [
            { kind: "bribe_faction", factionId: "faction.ghost", cost: 1, standing: 1 },
          ]),
      },
      {
        name: "npc.reactsTo overrideDialogueId",
        ghost: /dialogue\.ghost/,
        mut: (p) =>
          ((p.npcs as { reactsTo?: unknown[] }[])[0]!.reactsTo = [
            {
              when: [{ kind: "flag_is", flag: "flag.x", equals: true }],
              setsFlags: [],
              overrideDialogueId: "dialogue.ghost",
            },
          ]),
      },
      {
        name: "storylet content.dialogueId",
        ghost: /dialogue\.ghost/,
        mut: (p) =>
          (p.storylets = [
            {
              id: "storylet.x",
              preconditions: [],
              salience: 0,
              tags: [],
              content: { dialogueId: "dialogue.ghost" },
              effects: [],
            },
          ]) as unknown as void,
      },
    ];
    for (const c of cases) {
      const p = validPack();
      c.mut(p);
      try {
        loadPacks([p]);
        throw new Error(`expected a dangling-ref error for path: ${c.name}`);
      } catch (err) {
        expect(String((err as Error).message), c.name).toMatch(c.ghost);
      }
    }
  });
});
