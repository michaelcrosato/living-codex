import { describe, it, expect } from "vitest";
import { ContentPack, type CanonAssertion } from "@codex/content-schema";
import {
  buildCanonGraph,
  findCanonContradictions,
  findDanglingAssertionRefs,
  auditCanon,
  relevantSubgraph,
  serializeAssertion,
  renderAssertionRecord,
} from "./canon-graph";
import { buildRegistries } from "./registries";

/** Minimal valid pack carrying only assertions — enough to exercise the semantic rules. */
function assertingPack(assertions: CanonAssertion[], id = "pack.test"): ContentPack {
  return ContentPack.parse({
    id,
    version: "0",
    title: "test",
    provenance: { authoredBy: "human" },
    assertions,
  });
}

const npc = (over: Record<string, unknown>): Record<string, unknown> => ({
  name: "X",
  appearance: { bodyColor: "#000", accentColor: "#fff", silhouette: "humanoid" },
  bio: { role: "r", backstory: "b", wants: "w", fears: "f", voice: "v" },
  dialogueId: "dialogue.x",
  ...over,
});

describe("canon assertion graph (CONTENT_PIPELINE.md §6)", () => {
  it("a consistent world produces no contradictions", () => {
    const pack = assertingPack([
      { predicate: "funds", subject: "npc.varga", object: "faction.crew" },
      { predicate: "status", subject: "npc.varga", state: "solvent" },
      { predicate: "status", subject: "faction.crew", state: "wealthy" },
      { predicate: "fact", subject: "npc.varga", note: "keeps her debts in a little black book" },
    ]);
    expect(findCanonContradictions(buildCanonGraph([pack]))).toEqual([]);
  });

  it("exclusive-status: a subject cannot be both alive and dead in the same epoch", () => {
    const pack = assertingPack([
      { predicate: "status", subject: "npc.kaine", state: "alive" },
      { predicate: "status", subject: "npc.kaine", state: "dead" },
    ]);
    const found = findCanonContradictions(buildCanonGraph([pack]));
    expect(found).toHaveLength(1);
    expect(found[0]?.rule).toBe("exclusive-status");
    expect(found[0]?.subjects).toEqual(["npc.kaine"]);
  });

  it("status-over-time: differing `since` epochs are a legitimate timeline, not a contradiction", () => {
    const pack = assertingPack([
      { predicate: "status", subject: "npc.kaine", state: "alive", since: 0 },
      { predicate: "status", subject: "npc.kaine", state: "dead", since: 5 },
    ]);
    expect(findCanonContradictions(buildCanonGraph([pack]))).toEqual([]);
  });

  it("a dead NPC who is still placed in the world is caught (authored dead vs derived alive)", () => {
    // placement ⟹ the app spawns the NPC ⟹ canonically present ⟹ alive
    const pack = ContentPack.parse({
      id: "pack.ghosttown",
      version: "0",
      title: "t",
      provenance: { authoredBy: "human" },
      npcs: [npc({ id: "npc.kaine", homeLocationId: "location.morgue" })],
      assertions: [{ predicate: "status", subject: "npc.kaine", state: "dead" }],
    });
    const found = findCanonContradictions(buildCanonGraph([pack]));
    expect(found.map((c) => c.rule)).toContain("exclusive-status");
  });

  it("allegiance-polarity: a faction cannot be both allied with and an enemy of another (derived)", () => {
    const pack = ContentPack.parse({
      id: "pack.feud",
      version: "0",
      title: "t",
      provenance: { authoredBy: "human" },
      factions: [
        { id: "faction.a", name: "A", ethos: "e", allies: ["faction.b"], rivals: ["faction.b"] },
      ],
    });
    const found = findCanonContradictions(buildCanonGraph([pack]));
    expect(found).toHaveLength(1);
    expect(found[0]?.rule).toBe("allegiance-polarity");
    expect(found[0]?.subjects.sort()).toEqual(["faction.a", "faction.b"]);
  });

  it("allegiance-polarity is symmetric and spans packs (blast radius lists both)", () => {
    const p1 = assertingPack(
      [{ predicate: "allied_with", subject: "faction.a", object: "faction.b" }],
      "pack.one",
    );
    const p2 = assertingPack(
      [{ predicate: "enemy_of", subject: "faction.b", object: "faction.a" }],
      "pack.two",
    );
    const found = findCanonContradictions(buildCanonGraph([p1, p2]));
    expect(found).toHaveLength(1);
    expect(found[0]?.sources).toEqual(["pack.one", "pack.two"]);
  });

  it("funds-while-broke: the §6 example — secretly broke yet quietly funding a faction", () => {
    const pack = assertingPack([
      { predicate: "funds", subject: "npc.varga", object: "faction.syndicate" },
      { predicate: "status", subject: "npc.varga", state: "broke" },
    ]);
    const found = findCanonContradictions(buildCanonGraph([pack]));
    expect(found).toHaveLength(1);
    expect(found[0]?.rule).toBe("funds-while-broke");
  });

  it("derives member_of from an NPC's faction", () => {
    const pack = ContentPack.parse({
      id: "pack.crew",
      version: "0",
      title: "t",
      provenance: { authoredBy: "human" },
      npcs: [npc({ id: "npc.varga", faction: "faction.crew" })],
    });
    const graph = buildCanonGraph([pack]);
    const member = graph.records.find((r) => r.assertion.predicate === "member_of");
    expect(member?.derived).toBe(true);
    expect(member?.assertion).toMatchObject({ subject: "npc.varga", object: "faction.crew" });
  });

  it("dangling-ref: an authored assertion pointing at a nonexistent entity is flagged", () => {
    const pack = ContentPack.parse({
      id: "pack.refs",
      version: "0",
      title: "t",
      provenance: { authoredBy: "human" },
      factions: [{ id: "faction.real", name: "R", ethos: "e" }],
      assertions: [
        { predicate: "member_of", subject: "npc.ghost", object: "faction.real" },
        { predicate: "status", subject: "faction.real", state: "solvent" },
      ],
    });
    const registries = buildRegistries([pack]);
    const dangling = findDanglingAssertionRefs(buildCanonGraph([pack]), registries);
    expect(dangling).toHaveLength(1);
    expect(dangling[0]?.subjects).toEqual(["npc.ghost"]);
  });

  it("auditCanon runs every rule and returns nothing for a clean, self-referential pack", () => {
    const pack = ContentPack.parse({
      id: "pack.clean",
      version: "0",
      title: "t",
      provenance: { authoredBy: "human" },
      factions: [
        { id: "faction.a", name: "A", ethos: "e", rivals: ["faction.b"] },
        { id: "faction.b", name: "B", ethos: "e", rivals: ["faction.a"] },
      ],
      assertions: [{ predicate: "status", subject: "faction.a", state: "wealthy" }],
    });
    expect(auditCanon([pack], buildRegistries([pack]))).toEqual([]);
  });

  describe("relevantSubgraph and serialization", () => {
    it("returns expected neighbors for a fixture graph and excludes unrelated packs", () => {
      const p1 = ContentPack.parse({
        id: "pack.one",
        version: "0",
        title: "Pack One",
        provenance: { authoredBy: "human" },
        npcs: [npc({ id: "npc.varga", faction: "faction.varga_crew" })],
        assertions: [
          { predicate: "status", subject: "npc.varga", state: "alive" },
          { predicate: "fact", subject: "npc.varga", note: "knows the docks" },
        ],
      });

      const p2 = ContentPack.parse({
        id: "pack.two",
        version: "0",
        title: "Pack Two",
        provenance: { authoredBy: "human" },
        factions: [
          { id: "faction.varga_crew", name: "Varga Crew", ethos: "Docks", allies: ["faction.smugglers"] },
        ],
        assertions: [
          { predicate: "status", subject: "faction.varga_crew", state: "solvent" },
        ],
      });

      const pUnrelated = ContentPack.parse({
        id: "pack.unrelated",
        version: "0",
        title: "Pack Unrelated",
        provenance: { authoredBy: "human" },
        assertions: [
          { predicate: "status", subject: "npc.unrelated", state: "alive" },
        ],
      });

      const graph = buildCanonGraph([p1, p2, pUnrelated]);

      // Query subgraph for npc.varga
      const sub = relevantSubgraph(graph, ["npc.varga"]);

      // npc.varga 1-hop neighbors should be faction.varga_crew (due to member_of)
      // Therefore, relevantEntities = { npc.varga, faction.varga_crew }
      // Should include npc.varga's status, fact, member_of, faction.varga_crew's status, allied_with
      // Should NOT include npc.unrelated's status
      const assertions = sub.records.map((r) => r.assertion);
      
      expect(assertions.some((a) => a.predicate === "member_of" && a.subject === "npc.varga" && a.object === "faction.varga_crew")).toBe(true);
      expect(assertions.some((a) => a.predicate === "status" && a.subject === "faction.varga_crew" && a.state === "solvent")).toBe(true);
      expect(assertions.some((a) => a.predicate === "allied_with" && a.subject === "faction.varga_crew" && a.object === "faction.smugglers")).toBe(true);

      // Excludes npc.unrelated
      expect(assertions.some((a) => a.subject === "npc.unrelated")).toBe(false);

      // Verify renderAssertionRecord and serializeAssertion
      const memberRec = sub.records.find((r) => r.assertion.predicate === "member_of");
      expect(memberRec).toBeDefined();
      expect(renderAssertionRecord(memberRec!)).toBe("- npc.varga is member of faction.varga_crew (from pack.one [derived])");

      // Determinism test (stable sorting: deterministic across runs)
      const sub2 = relevantSubgraph(graph, ["npc.varga"]);
      expect(sub.records).toEqual(sub2.records);
    });

    it("serializeAssertion matches schema correctly", () => {
      const a1: CanonAssertion = { predicate: "status", subject: "npc.varga", state: "alive", since: 3 };
      expect(serializeAssertion(a1)).toBe("npc.varga is alive since epoch 3");

      const a2: CanonAssertion = { predicate: "fact", subject: "npc.varga", note: "hello" };
      expect(serializeAssertion(a2)).toBe("npc.varga: hello");

      const a3: CanonAssertion = { predicate: "member_of", subject: "npc.varga", object: "faction.crew" };
      expect(serializeAssertion(a3)).toBe("npc.varga is member of faction.crew");

      const a4: CanonAssertion = { predicate: "allied_with", subject: "faction.a", object: "faction.b" };
      expect(serializeAssertion(a4)).toBe("faction.a allied with faction.b");
    });
  });

  describe("hardened semantic + serialization coverage (SPEC-40)", () => {
    it("exclusive-status governs SOLVENCY too: broke and wealthy in one epoch contradict", () => {
      // The life group (alive/dead) is covered above; this pins the second STATUS_GROUP arm.
      const pack = assertingPack([
        { predicate: "status", subject: "npc.varga", state: "broke" },
        { predicate: "status", subject: "npc.varga", state: "wealthy" },
      ]);
      const found = findCanonContradictions(buildCanonGraph([pack]));
      expect(found).toHaveLength(1);
      expect(found[0]?.rule).toBe("exclusive-status");
      expect(found[0]?.subjects).toEqual(["npc.varga"]);
    });

    it("placement via npcSpawns implies alive — a dead spawned NPC is caught (distinct from homeLocationId)", () => {
      // The homeLocationId⟹alive path is tested above; this exercises the npcSpawns⟹alive arm.
      const pack = ContentPack.parse({
        id: "pack.spawned",
        version: "0",
        title: "t",
        provenance: { authoredBy: "human" },
        locations: [
          {
            id: "location.plaza",
            name: "Plaza",
            mood: "tense",
            bounds: { w: 10, h: 10 },
            art: [],
            npcSpawns: [{ npcId: "npc.kaine", at: { x: 1, y: 1 } }],
          },
        ],
        assertions: [{ predicate: "status", subject: "npc.kaine", state: "dead" }],
      });
      const found = findCanonContradictions(buildCanonGraph([pack]));
      expect(found.map((c) => c.rule)).toContain("exclusive-status");
    });

    it("serializeAssertion renders the remaining predicates (enemy_of / funds / located_in)", () => {
      expect(
        serializeAssertion({ predicate: "enemy_of", subject: "faction.a", object: "faction.b" }),
      ).toBe("faction.a enemy of faction.b");
      expect(
        serializeAssertion({ predicate: "funds", subject: "npc.varga", object: "faction.crew" }),
      ).toBe("npc.varga funds faction.crew");
      expect(
        serializeAssertion({ predicate: "located_in", subject: "npc.varga", object: "location.docks" }),
      ).toBe("npc.varga located in location.docks");
    });

    it("dangling assertion refs are caught per reachable entity kind (faction via funds, location via located_in)", () => {
      // refExists' npc arm is covered above; funds/located_in are the only predicates that can
      // reference a faction/location, so these are the remaining *reachable* arms.
      const base = {
        version: "0",
        title: "t",
        provenance: { authoredBy: "human" as const },
        npcs: [npc({ id: "npc.real" })],
        factions: [{ id: "faction.real", name: "R", ethos: "e" }],
      };
      const cases = [
        {
          pack: ContentPack.parse({
            ...base,
            id: "pack.fg",
            assertions: [{ predicate: "funds", subject: "npc.real", object: "faction.ghost" }],
          }),
          ghost: "faction.ghost",
        },
        {
          pack: ContentPack.parse({
            ...base,
            id: "pack.lg",
            assertions: [{ predicate: "located_in", subject: "npc.real", object: "location.ghost" }],
          }),
          ghost: "location.ghost",
        },
      ];
      for (const { pack, ghost } of cases) {
        const dangling = findDanglingAssertionRefs(buildCanonGraph([pack]), buildRegistries([pack]));
        expect(dangling.map((d) => d.subjects[0]), ghost).toContain(ghost);
      }
    });
  });
});
