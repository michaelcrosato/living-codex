import { describe, it, expect } from "vitest";
import { LocationId } from "@codex/content-schema";
import { createWorld, type World, type Entity } from "../state/world";
import { applyEvent, applyEvents } from "../events/apply";
import { hash } from "../state/snapshot";
import { combatSystem } from "./combat";

const START = LocationId.parse("location.start");

function withGuard(hp: number, force = 4): World {
  const w = createWorld({ seed: "ashfall", startLocationId: START, skills: { force } });
  const guard: Entity = {
    id: "entity.guard",
    defId: "npc.guard",
    locationId: START,
    pos: { x: 0, y: 0 },
    hp,
    alive: true,
  };
  return applyEvent(w, { type: "SpawnEntity", entity: guard });
}

describe("minimal combat", () => {
  it("emits a ResolveAttack against a co-located living combatant", () => {
    const evs = combatSystem([{ type: "Attack" }])(withGuard(12), 0);
    expect(evs).toEqual([
      { type: "ResolveAttack", attackerEntityId: "entity.player", targetEntityId: "entity.guard" },
    ]);
  });

  it("emits nothing when there is no combatant", () => {
    const w = createWorld({ seed: "s", startLocationId: START });
    expect(combatSystem([{ type: "Attack" }])(w, 0)).toEqual([]);
  });

  it("repeated attacks deterministically defeat the guard", () => {
    let w = withGuard(12);
    const sys = combatSystem([{ type: "Attack" }]);
    for (let i = 0; i < 5 && w.entities["entity.guard"]?.alive; i++) {
      w = applyEvents(w, sys(w, 0));
    }
    expect(w.entities["entity.guard"]?.alive).toBe(false);
    expect(w.entities["entity.guard"]?.hp).toBe(0);
  });

  it("ResolveAttack is deterministic under a fixed seed", () => {
    const w = withGuard(12);
    const ev = {
      type: "ResolveAttack",
      attackerEntityId: "entity.player",
      targetEntityId: "entity.guard",
    } as const;
    expect(hash(applyEvent(w, ev))).toBe(hash(applyEvent(w, ev)));
  });
});
