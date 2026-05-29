import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import fc from "fast-check";
import { loadPacks } from "@codex/content-loader";
import { QuestId, LocationId, FlagId, FactionId } from "@codex/content-schema";
import { createWorld, hash, replay, type InputEvent } from "@codex/engine-core";
import { InkNarrative } from "@codex/narrative-ink";
import { GameSession, type GameSessionOptions } from "../src/session";

/**
 * SPEC-05 — the strongest determinism guarantee, as a property: for ANY sequence of player
 * inputs, hash(replay(log, seed)) === hash(live). This drives random inputs through the FULL
 * system stack (movement, interaction, combat, quests, bribe, reactions, dialogue) — complementing
 * replay.test.ts, which fuzzes at the lower applyEvent level. A failure shrinks to a minimal input
 * sequence; pair with engine-core's replayTrace/firstDivergence (SPEC-04) to bisect the tick.
 */
const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const { registries, fingerprint } = loadPacks([raw]);

const QID = QuestId.parse("quest.the_warehouse");
const DISTRICT = LocationId.parse("location.ashfall_district");
const MET = FlagId.parse("flag.met_varga");
const SYNDICATE = FactionId.parse("faction.ashfall_syndicate");
const BRANCHES = ["talk", "sneak", "force"];

// Valid-SHAPED inputs bounded to the loaded content. Well-typed-but-ineffective inputs (an
// out-of-range exit, a bribe you can't afford, an Attempt on a branch you aren't on) are included
// on purpose: systems must treat them as deterministic no-ops and still replay identically — which
// is exactly the property under test.
const inputArb = fc.oneof(
  fc.record({
    type: fc.constant("Move"),
    dir: fc.record({ x: fc.integer({ min: -1, max: 1 }), y: fc.integer({ min: -1, max: 1 }) }),
  }),
  fc.constant({ type: "Interact" }),
  fc.constant({ type: "Attack" }),
  fc.record({ type: fc.constant("UseExit"), exitIndex: fc.integer({ min: 0, max: 4 }) }),
  fc.record({
    type: fc.constant("Attempt"),
    questId: fc.constant(QID),
    branchId: fc.constantFrom(...BRANCHES),
  }),
  fc.record({
    type: fc.constant("Bribe"),
    factionId: fc.constant(SYNDICATE),
    cost: fc.integer({ min: 1, max: 50 }),
    standing: fc.integer({ min: -20, max: 20 }),
  }),
) as unknown as fc.Arbitrary<InputEvent>;

function makeOpts(): GameSessionOptions {
  return {
    seed: "fuzz",
    startLocationId: DISTRICT,
    startPos: { x: 50, y: 50 },
    skills: { persuade: 2, sneak: 2, force: 3, tech: 1 },
    seedEvents: [{ type: "SetFlag", flag: MET, to: true }],
  };
}

describe("replay invariant under fuzzed input sequences (SPEC-05)", () => {
  it("any sequence of valid-shaped inputs replays to an identical hash", () => {
    fc.assert(
      fc.property(fc.array(fc.array(inputArb, { maxLength: 2 }), { maxLength: 30 }), (perTick) => {
        const opts = makeOpts();
        const session = new GameSession(registries, fingerprint, new InkNarrative(), opts);
        for (const inputs of perTick) session.step(inputs);
        const replayed = replay(createWorld(opts), session.log, { against: fingerprint });
        expect(hash(replayed)).toBe(hash(session.world));
      }),
      { numRuns: 60, seed: 0xc0de },
    );
  });
});
