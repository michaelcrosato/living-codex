import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import fc from "fast-check";
import { loadPacks } from "@codex/content-loader";
import {
  QuestId,
  LocationId,
  FlagId,
  FactionId,
  type ContentFingerprint,
} from "@codex/content-schema";
import { createWorld, hash, replay, type InputEvent } from "@codex/engine-core";
import { InkNarrative } from "@codex/narrative-ink";
import { GameSession, type GameSessionOptions } from "../src/session";

/**
 * SPEC-31 — model-based determinism suite (fast-check `fc.commands`). Where SPEC-05 fuzzes flat
 * random input *sequences*, this drives random COMMAND sequences through the real GameSession and
 * asserts the engine's invariants AFTER EVERY command — with automatic shrinking to a minimal
 * failing trace. The "model" is intentionally tiny (the invariants live on the real system); the
 * value is varied, shrinkable command interleavings + per-step checking.
 */
const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const loaded = loadPacks([raw]);

const QID = QuestId.parse("quest.the_warehouse");
const DISTRICT = LocationId.parse("location.ashfall_district");
const MET = FlagId.parse("flag.met_varga");
const SYNDICATE = FactionId.parse("faction.ashfall_syndicate");

function makeOpts(): GameSessionOptions {
  return {
    seed: "model",
    startLocationId: DISTRICT,
    startPos: { x: 50, y: 50 },
    skills: { persuade: 2, sneak: 2, force: 3, tech: 1 },
    seedEvents: [{ type: "SetFlag", flag: MET, to: true }],
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

/** The engine invariants that must hold after every command — including replay-exactness. */
function checkInvariants(r: Real): void {
  const w = r.session.world;
  const credits = (w.inventory as Record<string, number>)["item.credits"] ?? 0;
  expect(credits, "credits never go negative").toBeGreaterThanOrEqual(0);
  for (const [id, e] of Object.entries(w.entities)) {
    if (e.hp !== undefined) expect(e.hp, `${id} hp >= 0`).toBeGreaterThanOrEqual(0);
  }
  expect(w.entities["entity.player"], "player entity persists").toBeDefined();
  // Determinism: replaying the log so far reproduces the live world exactly (hash(replay)===hash(live)).
  const replayed = replay(createWorld(r.opts), r.session.log, { against: r.fingerprint });
  expect(hash(replayed), "replay invariant holds at every step").toBe(hash(r.session.world));
}

/** A command = one player input stepped through the real session, then all invariants asserted. */
function cmd(label: string, input: InputEvent): fc.Command<Model, Real> {
  return {
    check: () => true, // all inputs are valid-SHAPED; systems treat inapplicable ones as deterministic no-ops
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
  fc
    .integer({ min: 0, max: 4 })
    .map((i) => cmd(`UseExit(${i})`, { type: "UseExit", exitIndex: i })),
  fc
    .constantFrom("talk", "sneak", "force")
    .map((b) => cmd(`Attempt(${b})`, { type: "Attempt", questId: QID, branchId: b })),
  fc
    .record({ cost: fc.integer({ min: 1, max: 50 }), standing: fc.integer({ min: -20, max: 20 }) })
    .map(({ cost, standing }) =>
      cmd(`Bribe(${cost},${standing})`, { type: "Bribe", factionId: SYNDICATE, cost, standing }),
    ),
];

describe("model-based determinism suite (SPEC-31)", () => {
  it("any command sequence preserves invariants + replay-exactness at every step", () => {
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
      { numRuns: 40, seed: 0x5eed },
    );
  });

  it("exercises a mixed command sequence end-to-end (sanity + log growth)", () => {
    const o = makeOpts();
    const session = new GameSession(loaded.registries, loaded.fingerprint, new InkNarrative(), o);
    const inputs: InputEvent[] = [
      { type: "Move", dir: { x: 1, y: 0 } },
      { type: "Interact" },
      { type: "Attempt", questId: QID, branchId: "talk" },
      { type: "Bribe", factionId: SYNDICATE, cost: 10, standing: 5 },
      { type: "Attack" },
    ];
    const before = session.log.entries.length;
    for (const input of inputs) session.step([input]);
    expect(session.log.entries.length).toBeGreaterThan(before);
    const replayed = replay(createWorld(o), session.log, { against: loaded.fingerprint });
    expect(hash(replayed)).toBe(hash(session.world));
  });
});
