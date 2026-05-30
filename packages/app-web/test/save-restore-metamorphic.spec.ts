import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import fc from "fast-check";
import { loadPacks } from "@codex/content-loader";
import { QuestId, LocationId, FlagId, type ContentFingerprint } from "@codex/content-schema";
import {
  hash,
  makeSave,
  type GameEvent,
  type InputEvent,
  type SaveEnvelope,
} from "@codex/engine-core";
import { InkNarrative } from "@codex/narrative-ink";
import { GameSession, type GameSessionOptions } from "../src/session";

/**
 * SPEC-108 — metamorphic property: save/restore is transparent to continued play.
 *
 *   play(seed, A ++ B)  ≡  restore( jsonRoundTrip( makeSave( play(seed, A) ) ) ).play(B)
 *
 * SPEC-78 proves restore reconstructs an identical world AT the save point, but the snapshot HASH
 * normalizes key order (sortKeys, SPEC-46) — so a JSON round-trip could reorder Map/object iteration
 * (or shift a field) invisibly to that check, yet diverge on CONTINUED play if any system leaked
 * order-dependence. This drives the real serialization path (makeSave → JSON stringify/parse →
 * loadSave → restore) and asserts the continuation matches uninterrupted play. (2026 metamorphic-
 * testing best practice for deterministic engines — REPLENISH research.)
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
const FP: ContentFingerprint = loaded.fingerprint;

const WAREHOUSE = QuestId.parse("quest.the_warehouse");
const SYNDICATE_Q = QuestId.parse("quest.syndicate_offer");
const DISTRICT = LocationId.parse("location.ashfall_district");
const setFlag = (flag: string): GameEvent => ({
  type: "SetFlag",
  flag: FlagId.parse(flag),
  to: true,
});

function makeOpts(): GameSessionOptions {
  return {
    seed: "metamorphic",
    startLocationId: DISTRICT,
    startPos: { x: 50, y: 50 },
    skills: { persuade: 5, sneak: 5, force: 5, tech: 5 },
    seedEvents: [
      setFlag("flag.met_varga"),
      setFlag("flag.has_drive"),
      setFlag("flag.knows_syndicate_secret"),
      setFlag("flag.sold_drive"),
      setFlag("flag.sided_with_kestrel"),
    ],
  };
}

const newSession = (): GameSession =>
  new GameSession(loaded.registries, FP, new InkNarrative(), makeOpts());

const inputArb: fc.Arbitrary<InputEvent> = fc.oneof(
  fc
    .record({ x: fc.integer({ min: -1, max: 1 }), y: fc.integer({ min: -1, max: 1 }) })
    .map(({ x, y }): InputEvent => ({ type: "Move", dir: { x, y } })),
  fc.constant<InputEvent>({ type: "Interact" }),
  fc.constant<InputEvent>({ type: "Attack" }),
  fc.integer({ min: 0, max: 4 }).map((i): InputEvent => ({ type: "UseExit", exitIndex: i })),
  fc
    .constantFrom("talk", "sneak", "force")
    .map((b): InputEvent => ({ type: "Attempt", questId: WAREHOUSE, branchId: b })),
  fc
    .constantFrom("sell", "decrypt", "leverage")
    .map((b): InputEvent => ({ type: "Attempt", questId: SYNDICATE_Q, branchId: b })),
);

describe("metamorphic save/restore-continuation (SPEC-108)", () => {
  it("saving mid-play, JSON round-tripping, restoring, and continuing equals uninterrupted play", () => {
    fc.assert(
      fc.property(
        fc.array(inputArb, { minLength: 1, maxLength: 14 }),
        fc.nat(),
        (inputs, splitRaw) => {
          const split = splitRaw % (inputs.length + 1);
          const a = inputs.slice(0, split);
          const b = inputs.slice(split);

          // Control: play A then B without interruption.
          const control = newSession();
          for (const i of a) control.step([i]);
          for (const i of b) control.step([i]);

          // Metamorphic: play A, snapshot → JSON round-trip → restore, then play B.
          const s = newSession();
          for (const i of a) s.step([i]);
          const envelope = makeSave(s.world, [], FP);
          const roundTripped = JSON.parse(JSON.stringify(envelope)) as SaveEnvelope;
          const restored = GameSession.restore(
            loaded.registries,
            FP,
            new InkNarrative(),
            roundTripped,
          );
          for (const i of b) restored.step([i]);

          expect(hash(restored.world)).toBe(hash(control.world));
        },
      ),
      { numRuns: 40, seed: 0x5a7e },
    );
  });
});
