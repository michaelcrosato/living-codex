import { describe, it, expect } from "vitest";
import { Storylet, StoryletId, FlagId, LocationId, FactionId } from "@codex/content-schema";
import { createWorld } from "../state/world";
import { applyEvent } from "../events/apply";
import { storyletSystem, waypointBonus } from "./storylet";

const START = LocationId.parse("location.start");
const MET_VARGA = FlagId.parse("flag.met_varga");
const FRIEND = FlagId.parse("flag.friend");
const VARGA_CREW = FactionId.parse("faction.varga_crew");

/** Helper: pull the TriggerStorylet candidates a system emits for a world. */
function candidates(
  reg: Map<StoryletId, Storylet>,
  world: ReturnType<typeof createWorld>,
): Storylet[] {
  const ev = storyletSystem(reg)(world, 0)[0];
  if (!ev || ev.type !== "TriggerStorylet") throw new Error("Expected TriggerStorylet");
  return ev.candidates;
}

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

const aligned = Storylet.parse({
  id: "storylet.aligned",
  preconditions: [],
  salience: 5,
  tags: ["faction.varga_crew"], // a faction-id tag → eligible for waypoint steering
  content: { ambient: "Varga's people nod as you pass." },
  effects: [],
});
const plain = Storylet.parse({
  id: "storylet.plain",
  preconditions: [],
  salience: 5,
  tags: ["ambient"],
  content: { ambient: "Rain on the awnings." },
  effects: [],
});
const mainTagged = Storylet.parse({
  id: "storylet.main_beat",
  preconditions: [],
  salience: 5,
  tags: ["faction.varga_crew", "main"], // has the faction tag BUT is main-plot → never steered
  content: { ambient: "This should never be salience-boosted." },
  effects: [],
});

describe("drama-manager waypoint steering (SPEC-32)", () => {
  it("with no aligned faction, effective salience == base salience (SPEC-11 baseline)", () => {
    const world = createWorld({ seed: "s", startLocationId: START });
    // equal base salience, no reputation → both tie as candidates (unchanged from baseline)
    const reg = new Map<StoryletId, Storylet>([
      [aligned.id, aligned],
      [plain.id, plain],
    ]);
    expect(
      candidates(reg, world)
        .map((c) => c.id)
        .sort(),
    ).toEqual(["storylet.aligned", "storylet.plain"]);
  });

  it("promotes the aligned-faction storylet once the player is rising with that faction", () => {
    let world = createWorld({ seed: "s", startLocationId: START });
    world = applyEvent(world, { type: "AdjustReputation", factionId: VARGA_CREW, delta: 10 });
    const reg = new Map<StoryletId, Storylet>([
      [aligned.id, aligned],
      [plain.id, plain],
    ]);
    const cands = candidates(reg, world);
    expect(cands).toHaveLength(1);
    expect(cands[0]?.id).toBe("storylet.aligned"); // +1 waypoint bonus breaks the tie deterministically
  });

  it("never steers a 'main'-tagged storylet (guardrail)", () => {
    let world = createWorld({ seed: "s", startLocationId: START });
    world = applyEvent(world, { type: "AdjustReputation", factionId: VARGA_CREW, delta: 50 });
    const reg = new Map<StoryletId, Storylet>([
      [mainTagged.id, mainTagged],
      [plain.id, plain],
    ]);
    // mainTagged has the faction tag but is "main" → bonus 0 → still ties with plain (no promotion)
    expect(
      candidates(reg, world)
        .map((c) => c.id)
        .sort(),
    ).toEqual(["storylet.main_beat", "storylet.plain"]);
  });

  it("waypointBonus is pure, integer, and bounded", () => {
    let world = createWorld({ seed: "s", startLocationId: START });
    expect(waypointBonus(world, aligned)).toBe(0); // no reputation yet
    world = applyEvent(world, { type: "AdjustReputation", factionId: VARGA_CREW, delta: 10 });
    expect(waypointBonus(world, aligned)).toBe(1);
    expect(waypointBonus(world, mainTagged)).toBe(0); // main excluded even with the faction tag
    expect(waypointBonus(world, plain)).toBe(0); // no faction-id tag
  });
});
