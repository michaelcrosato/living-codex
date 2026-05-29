import { describe, it, expect } from "vitest";
import { Storylet, StoryletId, FlagId, LocationId } from "@codex/content-schema";
import { createWorld } from "../state/world";
import { applyEvent } from "../events/apply";
import { storyletSystem } from "./storylet";

const START = LocationId.parse("location.start");
const MET_VARGA = FlagId.parse("flag.met_varga");
const FRIEND = FlagId.parse("flag.friend");

const storylet1 = Storylet.parse({
  id: "storylet.low_salience",
  preconditions: [],
  salience: 0,
  tags: ["ambient"],
  content: { ambient: "Always active ambient bark" },
  effects: [],
});

const storylet2 = Storylet.parse({
  id: "storylet.high_salience",
  preconditions: [{ kind: "flag_is", flag: "flag.met_varga", equals: true }],
  salience: 10,
  tags: ["quest_progress"],
  content: { ambient: "Wow, you met Varga!" },
  effects: [{ kind: "set_flag", flag: "flag.friend", to: true }],
});

const storyletTieA = Storylet.parse({
  id: "storylet.tie_a",
  preconditions: [],
  salience: 5,
  tags: ["tie"],
  content: { ambient: "Tie A bark" },
  effects: [],
});

const storyletTieB = Storylet.parse({
  id: "storylet.tie_b",
  preconditions: [],
  salience: 5,
  tags: ["tie"],
  content: { ambient: "Tie B bark" },
  effects: [],
});

describe("storyletSystem & TriggerStorylet", () => {
  it("precondition-gated storylets stay hidden and fallback is chosen", () => {
    const world = createWorld({ seed: "test_seed", startLocationId: START });
    const registry = new Map<StoryletId, Storylet>([
      [storylet1.id, storylet1],
      [storylet2.id, storylet2],
    ]);

    const sys = storyletSystem(registry);
    const events = sys(world, 0);

    expect(events).toHaveLength(1);
    const triggerEvent = events[0];
    if (!triggerEvent) throw new Error("Expected TriggerStorylet event");
    expect(triggerEvent.type).toBe("TriggerStorylet");

    const trigger = triggerEvent as { type: "TriggerStorylet"; candidates: Storylet[] };
    expect(trigger.candidates).toHaveLength(1);
    expect(trigger.candidates[0]?.id).toBe(storylet1.id);

    // Apply the selection
    const nextWorld = applyEvent(world, triggerEvent);
    expect(nextWorld.flags[FRIEND]).toBeUndefined();
  });

  it("selects highest salience storylet when preconditions are met", () => {
    let world = createWorld({ seed: "test_seed", startLocationId: START });
    world = applyEvent(world, { type: "SetFlag", flag: MET_VARGA, to: true });

    const registry = new Map<StoryletId, Storylet>([
      [storylet1.id, storylet1],
      [storylet2.id, storylet2],
    ]);

    const sys = storyletSystem(registry);
    const events = sys(world, 0);

    expect(events).toHaveLength(1);
    const triggerEvent = events[0];
    if (!triggerEvent) throw new Error("Expected TriggerStorylet event");
    expect(triggerEvent.type).toBe("TriggerStorylet");

    const trigger = triggerEvent as { type: "TriggerStorylet"; candidates: Storylet[] };
    expect(trigger.candidates).toHaveLength(1);
    expect(trigger.candidates[0]?.id).toBe(storylet2.id);

    // Applying the event should trigger the storylet effects (set flag FRIEND)
    const nextWorld = applyEvent(world, triggerEvent);
    expect(nextWorld.flags[FRIEND]).toBe(true);
  });

  it("breaks ties deterministically using seeded RNG in fold", () => {
    const registry = new Map<StoryletId, Storylet>([
      [storyletTieA.id, storyletTieA],
      [storyletTieB.id, storyletTieB],
    ]);

    const sys = storyletSystem(registry);

    // Seed 1
    const world1 = createWorld({ seed: "determ_seed_1", startLocationId: START });
    const events1 = sys(world1, 0);
    const ev1 = events1[0];
    if (!ev1) throw new Error("Expected event");
    const result1 = applyEvent(world1, ev1);

    // Same seed re-run
    const world2 = createWorld({ seed: "determ_seed_1", startLocationId: START });
    const events2 = sys(world2, 0);
    const ev2 = events2[0];
    if (!ev2) throw new Error("Expected event");
    const result2 = applyEvent(world2, ev2);

    // Verify same seed is 100% identical and stable
    expect(result1.rngState).toBe(result2.rngState);

    // Seed 2 (different seeded state should be deterministic too)
    const world3 = createWorld({ seed: "determ_seed_2", startLocationId: START });
    const events3 = sys(world3, 0);
    const ev3 = events3[0];
    if (!ev3) throw new Error("Expected event");
    const result3 = applyEvent(world3, ev3);

    // Same seed re-run for seed 2
    const world4 = createWorld({ seed: "determ_seed_2", startLocationId: START });
    const events4 = sys(world4, 0);
    const ev4 = events4[0];
    if (!ev4) throw new Error("Expected event");
    const result4 = applyEvent(world4, ev4);

    expect(result3.rngState).toBe(result4.rngState);
  });
});
