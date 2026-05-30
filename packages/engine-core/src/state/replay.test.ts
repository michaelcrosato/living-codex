import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { ContentFingerprint } from "@codex/content-schema";
import { FlagId, FactionId, ItemId, LocationId, QuestId } from "@codex/content-schema";
import { createWorld, type SkillId } from "./world";
import { hash, serialize, deserialize } from "./snapshot";
import { applyEvents } from "../events/apply";
import type { GameEvent } from "../events/event";
import {
  createLog,
  appendEvent,
  replay,
  replayTrace,
  firstDivergence,
  makeSave,
  loadSave,
  type ReplayEntry,
} from "../events/log";

const SEED = "ashfall";
const START = LocationId.parse("location.start");
const FP: ContentFingerprint = { packs: { "pack.test": "1.0.0" }, registriesHash: "deadbeef" };

const flags = ["flag.a", "flag.b", "flag.c"].map((s) => FlagId.parse(s));
const factions = ["faction.x", "faction.y"].map((s) => FactionId.parse(s));
const items = ["item.a", "item.b"].map((s) => ItemId.parse(s));
const locations = ["location.start", "location.drip", "location.warehouse"].map((s) =>
  LocationId.parse(s),
);
const quests = ["quest.q1", "quest.q2"].map((s) => QuestId.parse(s));
const skills: SkillId[] = ["persuade", "sneak", "force", "tech"];

/** Arbitrary GameEvents that are always valid (positive gives → no inventory underflow). */
const eventArb = fc.oneof(
  fc.record({
    type: fc.constant("SetFlag"),
    flag: fc.constantFrom(...flags),
    to: fc.oneof(fc.boolean(), fc.integer({ min: 0, max: 9 }), fc.constantFrom("alpha", "beta")),
  }),
  fc.record({
    type: fc.constant("AdjustReputation"),
    factionId: fc.constantFrom(...factions),
    delta: fc.integer({ min: -60, max: 60 }),
  }),
  fc.record({
    type: fc.constant("GiveItem"),
    itemId: fc.constantFrom(...items),
    count: fc.integer({ min: 1, max: 5 }),
  }),
  fc.record({
    type: fc.constant("ModifySkill"),
    skill: fc.constantFrom(...skills),
    delta: fc.integer({ min: -3, max: 3 }),
  }),
  fc.record({
    type: fc.constant("EnterLocation"),
    locationId: fc.constantFrom(...locations),
    spawnAt: fc.record({
      x: fc.integer({ min: 0, max: 100 }),
      y: fc.integer({ min: 0, max: 100 }),
    }),
  }),
  fc.record({
    type: fc.constant("MoveEntity"),
    entityId: fc.constant("entity.player"),
    to: fc.record({ x: fc.integer({ min: -50, max: 50 }), y: fc.integer({ min: -50, max: 50 }) }),
  }),
  fc.record({ type: fc.constant("OfferQuest"), questId: fc.constantFrom(...quests) }),
) as unknown as fc.Arbitrary<GameEvent>;

describe("replay", () => {
  it("replay invariant: hash(replay(log, seed)) === hash(live) for any event sequence", () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 80 }), (events) => {
        const initial = createWorld({ seed: SEED, startLocationId: START });
        const live = applyEvents(initial, events);

        const log = createLog(SEED, FP);
        events.forEach((event, i) => appendEvent(log, i, event));

        const fresh = createWorld({ seed: SEED, startLocationId: START });
        const replayed = replay(fresh, log);

        expect(hash(replayed)).toBe(hash(live));
      }),
      { numRuns: 200 },
    );
  });

  it("snapshot + tail equals a full replay (WORLD_STATE.md §7 snapshot model)", () => {
    fc.assert(
      fc.property(
        fc.array(eventArb, { minLength: 4, maxLength: 40 }),
        fc.integer({ min: 1, max: 3 }),
        (events, splitSeed) => {
          const initial = createWorld({ seed: SEED, startLocationId: START });
          const full = applyEvents(initial, events);

          const k = Math.min(splitSeed, events.length);
          const snapshot = applyEvents(initial, events.slice(0, k));
          const tail: ReplayEntry[] = events
            .slice(k)
            .map((event, i) => ({ tick: k + i, kind: "event", event }));

          const loaded = loadSave(makeSave(snapshot, tail, FP));
          expect(hash(loaded)).toBe(hash(full));
        },
      ),
    );
  });

  it("replayTrace + firstDivergence bisect a divergence to the exact step", () => {
    const events: GameEvent[] = [
      { type: "SetFlag", flag: flags[0]!, to: true },
      { type: "GiveItem", itemId: items[0]!, count: 2 },
      { type: "AdjustReputation", factionId: factions[0]!, delta: 5 },
    ];

    const log = createLog(SEED, FP);
    events.forEach((e, i) => appendEvent(log, i, e));
    const traceA = replayTrace(createWorld({ seed: SEED, startLocationId: START }), log);

    // trace = initial + one per event; its final hash agrees with replay()
    expect(traceA).toHaveLength(events.length + 1);
    const replayed = replay(createWorld({ seed: SEED, startLocationId: START }), log);
    expect(traceA.at(-1)!.hash).toBe(hash(replayed));

    // an identical replay never diverges
    expect(
      firstDivergence(
        traceA,
        replayTrace(createWorld({ seed: SEED, startLocationId: START }), log),
      ),
    ).toBeNull();

    // perturb the 2nd event (count 2 -> 99): the trace must diverge exactly at that step (tick 1)
    const perturbed = createLog(SEED, FP);
    events.forEach((e, i) =>
      appendEvent(perturbed, i, i === 1 ? { type: "GiveItem", itemId: items[0]!, count: 99 } : e),
    );
    const div = firstDivergence(
      traceA,
      replayTrace(createWorld({ seed: SEED, startLocationId: START }), perturbed),
    );
    expect(div).not.toBeNull();
    expect(div!.tick).toBe(1);
    expect(div!.index).toBe(2); // [initial, after-e0, after-e1(diverges)]
  });

  it("serialize / deserialize round-trips exactly", () => {
    const initial = createWorld({ seed: SEED, startLocationId: START });
    const w = applyEvents(initial, [
      { type: "SetFlag", flag: flags[0]!, to: true },
      { type: "GiveItem", itemId: items[0]!, count: 3 },
      { type: "AdjustReputation", factionId: factions[0]!, delta: 12 },
    ]);
    const round = deserialize(serialize(w));
    expect(round).toEqual(w);
    expect(hash(round)).toBe(hash(w));
  });

  it("refuses a replay whose content fingerprint doesn't match (and can be told to ignore)", () => {
    const initial = createWorld({ seed: SEED, startLocationId: START });
    const log = createLog(SEED, { packs: {}, registriesHash: "AAA" });
    appendEvent(log, 0, { type: "SetFlag", flag: flags[0]!, to: true });

    const current: ContentFingerprint = { packs: {}, registriesHash: "BBB" };
    expect(() => replay(initial, log, { against: current })).toThrowError(/fingerprint mismatch/);
    expect(() => replay(initial, log, { against: current, onMismatch: "ignore" })).not.toThrow();
  });

  it("refuses a replay whose seed doesn't match the log", () => {
    const initial = createWorld({ seed: "other", startLocationId: START });
    const log = createLog(SEED, FP);
    expect(() => replay(initial, log)).toThrowError(/seed mismatch/);
  });

  it("firstDivergence reports the tail step when one trace is longer than the other", () => {
    const setFlag: GameEvent = { type: "SetFlag", flag: flags[0]!, to: true };
    const shortLog = createLog(SEED, FP);
    appendEvent(shortLog, 0, setFlag);
    const longLog = createLog(SEED, FP);
    appendEvent(longLog, 0, setFlag);
    appendEvent(longLog, 1, setFlag); // idempotent: the shared prefix stays identical
    const shortTrace = replayTrace(createWorld({ seed: SEED, startLocationId: START }), shortLog); // len 2
    const longTrace = replayTrace(createWorld({ seed: SEED, startLocationId: START }), longLog); //  len 3
    const div = firstDivergence(shortTrace, longTrace);
    expect(div).not.toBeNull();
    expect(div!.index).toBe(2); // identical prefix, then the longer trace has an extra step
    expect(div!.a).toBeUndefined(); // the shorter trace ran out
    expect(div!.b).toBeDefined();
  });

  it("replayTrace refuses a seed that doesn't match the log", () => {
    const log = createLog(SEED, FP);
    expect(() =>
      replayTrace(createWorld({ seed: "other", startLocationId: START }), log),
    ).toThrowError(/seed mismatch/);
  });
});
