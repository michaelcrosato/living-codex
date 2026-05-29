import { describe, it, expect } from "vitest";
import { NpcId, DialogueId, LocationId } from "@codex/content-schema";
import { createWorld, type Entity } from "../state/world";
import { applyEvent } from "../events/apply";
import { serialize, deserialize } from "../state/snapshot";
import type { NpcLookup } from "./components";
import { buildEcs, playerEntity, entitiesAt, interactablesAt, combatants } from "./registry";

const START = LocationId.parse("location.start");
const vargaDef = NpcId.parse("npc.varga");

const npcs: NpcLookup = new Map([
  [vargaDef, { dialogueId: DialogueId.parse("dialogue.varga_intro") }],
]);

function worldWithNpcs() {
  let w = createWorld({ seed: "s", startLocationId: START });
  const varga: Entity = {
    id: "entity.varga",
    defId: "npc.varga",
    locationId: START,
    pos: { x: 10, y: 10 },
    alive: true,
  };
  const guard: Entity = {
    id: "entity.guard",
    defId: "npc.guard",
    locationId: START,
    pos: { x: 20, y: 5 },
    hp: 12,
    alive: true,
  };
  w = applyEvent(w, { type: "SpawnEntity", entity: varga });
  w = applyEvent(w, { type: "SpawnEntity", entity: guard });
  return w;
}

describe("ECS (derived query layer)", () => {
  it("reflects world state: the player plus spawned entities", () => {
    const ecs = buildEcs(worldWithNpcs(), npcs);
    expect(ecs.entities).toHaveLength(3);
    expect(playerEntity(ecs)?.isPlayer).toBe(true);
    expect(entitiesAt(ecs, START)).toHaveLength(3);
  });

  it("joins the NPC registry to mark interactables (and excludes the player)", () => {
    const ecs = buildEcs(worldWithNpcs(), npcs);
    const interactables = interactablesAt(ecs, START);
    expect(interactables.map((e) => e.id)).toEqual(["entity.varga"]);
    expect(interactables[0]?.dialogueRef).toBe("dialogue.varga_intro");
  });

  it("combatants are living entities with hp", () => {
    const ecs = buildEcs(worldWithNpcs(), npcs);
    expect(combatants(ecs).map((e) => e.id)).toEqual(["entity.guard"]);
  });

  it("is purely derived — it survives a serialize/deserialize round-trip", () => {
    const world = worldWithNpcs();
    const normalize = (w: typeof world) =>
      buildEcs(w, npcs)
        .entities.map((e) => ({ id: e.id, pos: e.position, loc: e.locationId, alive: e.alive }))
        .sort((a, b) => (a.id < b.id ? -1 : 1));
    expect(normalize(deserialize(serialize(world)))).toEqual(normalize(world));
  });
});
