import { describe, it, expect } from "vitest";
import { Location, LocationId, NpcId, DialogueId, FlagId } from "@codex/content-schema";
import { createWorld, type Entity, type World } from "../state/world";
import { applyEvent } from "../events/apply";
import { tick } from "../tick";
import type { NpcLookup } from "../ecs/components";
import { movementSystem, PLAYER_SPEED } from "./movement";
import { interactionSystem, type InteractionContext } from "./interaction";

const START = LocationId.parse("location.start");
const NEXT = LocationId.parse("location.next");
const KEY = FlagId.parse("flag.has_key");

const npcs: NpcLookup = new Map([
  [NpcId.parse("npc.varga"), { dialogueId: DialogueId.parse("dialogue.varga_intro") }],
]);

/** A start location with one locked exit at (50,50) requiring flag.has_key. */
const startLocation = Location.parse({
  id: "location.start",
  name: "Start",
  mood: "m",
  bounds: { w: 100, h: 100 },
  art: [],
  exits: [
    {
      at: { x: 50, y: 50 },
      toLocationId: "location.next",
      spawnAt: { x: 1, y: 1 },
      label: "the next room",
      requires: [{ kind: "flag_is", flag: "flag.has_key", equals: true }],
    },
  ],
});

const ctx: InteractionContext = { locations: new Map([[START, startLocation]]), npcs };

function withVarga(world: World): World {
  const varga: Entity = {
    id: "entity.varga",
    defId: "npc.varga",
    locationId: START,
    pos: { x: 10, y: 10 },
    alive: true,
  };
  return applyEvent(world, { type: "SpawnEntity", entity: varga });
}

describe("movement system", () => {
  it("advances the player deterministically and emits nothing without input", () => {
    const w = createWorld({ seed: "s", startLocationId: START });
    const dt = 0.01;
    const moved = movementSystem([{ type: "Move", dir: { x: 1, y: 0 } }])(w, dt);
    expect(moved).toEqual([
      { type: "MoveEntity", entityId: "entity.player", to: { x: PLAYER_SPEED * dt, y: 0 } },
    ]);
    expect(movementSystem([])(w, dt)).toEqual([]);
  });

  it("integrates through the tick loop", () => {
    const w = createWorld({ seed: "s", startLocationId: START });
    const inputs = [{ type: "Move", dir: { x: 0, y: 1 } } as const];
    const result = tick(w, inputs, [movementSystem(inputs)], 0.05);
    expect(result.world.entities["entity.player"]?.pos.y).toBeCloseTo(PLAYER_SPEED * 0.05, 6);
    expect(result.world.tick).toBe(1);
  });
});

describe("interaction system", () => {
  it("emits Interacted for a nearby NPC and nothing for a distant one", () => {
    const w = withVarga(
      createWorld({ seed: "s", startLocationId: START, startPos: { x: 12, y: 12 } }),
    );
    const near = interactionSystem([{ type: "Interact" }], ctx)(w, 0);
    expect(near).toEqual([
      { type: "Interacted", entityId: "entity.varga", dialogueId: "dialogue.varga_intro" },
    ]);

    const far = createWorld({ seed: "s", startLocationId: START, startPos: { x: 90, y: 90 } });
    expect(interactionSystem([{ type: "Interact" }], ctx)(withVarga(far), 0)).toEqual([]);
  });

  it("gates a locked exit on its requires conditions", () => {
    const atExit = createWorld({ seed: "s", startLocationId: START, startPos: { x: 50, y: 50 } });
    const locked = interactionSystem([{ type: "UseExit", exitIndex: 0 }], ctx)(atExit, 0);
    expect(locked).toEqual([{ type: "ShowText", text: "The way to the next room is barred." }]);

    const unlocked = applyEvent(atExit, { type: "SetFlag", flag: KEY, to: true });
    const passed = interactionSystem([{ type: "UseExit", exitIndex: 0 }], ctx)(unlocked, 0);
    expect(passed).toEqual([{ type: "EnterLocation", locationId: NEXT, spawnAt: { x: 1, y: 1 } }]);
  });

  it("does not trigger an exit when the player is not near it", () => {
    const away = applyEvent(
      createWorld({ seed: "s", startLocationId: START, startPos: { x: 0, y: 0 } }),
      { type: "SetFlag", flag: KEY, to: true },
    );
    expect(interactionSystem([{ type: "UseExit", exitIndex: 0 }], ctx)(away, 0)).toEqual([]);
  });

  it("the unlock_exit effect force-opens a gated exit (S1.2)", () => {
    const atExit = createWorld({ seed: "s", startLocationId: START, startPos: { x: 50, y: 50 } });
    // unlock the exit directly (as the unlock_exit effect would), without setting the key flag
    const unlocked = applyEvent(atExit, { type: "UnlockExit", locationId: START, exitIndex: 0 });
    const passed = interactionSystem([{ type: "UseExit", exitIndex: 0 }], ctx)(unlocked, 0);
    expect(passed).toEqual([{ type: "EnterLocation", locationId: NEXT, spawnAt: { x: 1, y: 1 } }]);
  });
});
