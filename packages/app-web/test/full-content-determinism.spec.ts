import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import fc from "fast-check";
import { loadPacks } from "@codex/content-loader";
import { QuestId, LocationId, FlagId, type ContentFingerprint } from "@codex/content-schema";
import { createWorld, hash, replay, type InputEvent, type GameEvent } from "@codex/engine-core";
import { InkNarrative } from "@codex/narrative-ink";
import { GameSession, type GameSessionOptions } from "../src/session";

/**
 * SPEC-57 — full-content determinism fuzz. SPEC-05/31 fuzz only pack.opening; this loads the EXACT
 * live pack set (matching main.ts) and seeds a flag state that activates the new SPEC-52/55 reactions
 * and SPEC-50/54 storylets, then drives random command sequences and asserts replay-exactness
 * (hash(replay)===hash(live)) plus conservation after EVERY command — guarding the project's core
 * GOAL §5 invariant over what the app actually boots, not just the base pack.
 */
const read = (p: string): unknown =>
  JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8")) as unknown;
// The exact set main.ts loads (keep in lockstep with live-packs.spec.ts / main.ts).
const loaded = loadPacks([
  read("content/core/pack.opening/pack.json"),
  read("content/core/pack.district_barks/pack.json"),
  read("content/core/pack.drip_market/pack.json"),
  read("content/core/pack.syndicate_offer/pack.json"),
  read("content/core/pack.kestrel/pack.json"),
  read("content/generated/pack.the_drip_patrons/pack.json"),
]);

const WAREHOUSE = QuestId.parse("quest.the_warehouse");
const SYNDICATE_Q = QuestId.parse("quest.syndicate_offer");
const DISTRICT = LocationId.parse("location.ashfall_district");
const setFlag = (flag: string): GameEvent => ({ type: "SetFlag", flag: FlagId.parse(flag), to: true });

function makeOpts(): GameSessionOptions {
  return {
    seed: "full-content",
    startLocationId: DISTRICT,
    startPos: { x: 50, y: 50 },
    skills: { persuade: 5, sneak: 5, force: 5, tech: 5 },
    // Activate the new reactions (Varga betrayal, Kestrel loyalty) + the syndicate storylets so their
    // event-folding executes during the fuzzed run; replay must reproduce all of it exactly.
    seedEvents: [
      setFlag("flag.met_varga"),
      setFlag("flag.has_drive"),
      setFlag("flag.knows_syndicate_secret"),
      setFlag("flag.sold_drive"),
      setFlag("flag.sided_with_kestrel"),
    ],
  };
}

interface Model {
  steps: number;
}
interface Real {
  session: GameSession;
  opts: GameSessionOptions;
  fingerprint: ContentFingerprint;
}

function checkInvariants(r: Real): void {
  const w = r.session.world;
  const credits = (w.inventory as Record<string, number>)["item.credits"] ?? 0;
  expect(credits, "credits never go negative").toBeGreaterThanOrEqual(0);
  for (const [id, e] of Object.entries(w.entities)) {
    if (e.hp !== undefined) expect(e.hp, `${id} hp >= 0`).toBeGreaterThanOrEqual(0);
  }
  expect(w.entities["entity.player"], "player entity persists").toBeDefined();
  const replayed = replay(createWorld(r.opts), r.session.log, { against: r.fingerprint });
  expect(hash(replayed), "replay invariant holds at every step (full content)").toBe(
    hash(r.session.world),
  );
}

function cmd(label: string, input: InputEvent): fc.Command<Model, Real> {
  return {
    check: () => true,
    run: (m, r) => {
      m.steps++;
      r.session.step([input]);
      checkInvariants(r);
    },
    toString: () => label,
  };
}

const commandArbs = [
  fc
    .record({ x: fc.integer({ min: -1, max: 1 }), y: fc.integer({ min: -1, max: 1 }) })
    .map(({ x, y }) => cmd(`Move(${x},${y})`, { type: "Move", dir: { x, y } })),
  fc.constant(cmd("Interact", { type: "Interact" })),
  fc.constant(cmd("Attack", { type: "Attack" })),
  fc.integer({ min: 0, max: 4 }).map((i) => cmd(`UseExit(${i})`, { type: "UseExit", exitIndex: i })),
  fc
    .constantFrom("talk", "sneak", "force")
    .map((b) => cmd(`AttemptWarehouse(${b})`, { type: "Attempt", questId: WAREHOUSE, branchId: b })),
  fc
    .constantFrom("sell", "decrypt", "leverage")
    .map((b) => cmd(`AttemptSyndicate(${b})`, { type: "Attempt", questId: SYNDICATE_Q, branchId: b })),
];

describe("full-content determinism fuzz (SPEC-57)", () => {
  it("random play over the live pack set preserves replay-exactness at every step", () => {
    fc.assert(
      fc.property(fc.commands(commandArbs, { maxCommands: 12 }), (cmds) => {
        const o = makeOpts();
        const setup = (): { model: Model; real: Real } => ({
          model: { steps: 0 },
          real: {
            session: new GameSession(loaded.registries, loaded.fingerprint, new InkNarrative(), o),
            opts: o,
            fingerprint: loaded.fingerprint,
          },
        });
        fc.modelRun(setup, cmds);
      }),
      { numRuns: 30, seed: 0xc0ffee },
    );
  });
});
