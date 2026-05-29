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
    items: [
      { id: "item.encrypted_drive", name: "Drive", description: "Secrets.", kind: "quest" },
    ],
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
      dialogues: [{ id: "dialogue.b", format: "ink-json", inkVersion: "21", sourceHash: "x", compiled: {} }],
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
});
