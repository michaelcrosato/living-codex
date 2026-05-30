import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { LocationId, FlagId, type Storylet } from "@codex/content-schema";
import { createWorld, hash, replay, type GameEvent } from "@codex/engine-core";
import { InkNarrative } from "@codex/narrative-ink";
import { GameSession, type GameSessionOptions } from "../src/session";

/**
 * SPEC-24 — proves the storylet layer (SPEC-11) end-to-end through real, hand-authored content:
 * `content/core/pack.district_barks` defines fire-once ambient barks gated on world state (a flag,
 * a `skill_at_least` passive check from SPEC-23, and quest completion). Drives them through the
 * REAL GameSession/tick path and asserts (a) the bark fires when its precondition holds, (b) it
 * fires ONCE (its effect sets a flag a precondition excludes), (c) the `skill_at_least` gate works,
 * and (d) the replay invariant still holds with storylets active.
 */
function loadBoth(): ReturnType<typeof loadPacks> {
  const read = (p: string): unknown =>
    JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8")) as unknown;
  return loadPacks([
    read("content/core/pack.opening/pack.json"),
    read("content/core/pack.district_barks/pack.json"),
  ]);
}

const DISTRICT = LocationId.parse("location.ashfall_district");
const MET = FlagId.parse("flag.met_varga");

function triggerOf(events: readonly GameEvent[]): Storylet[] | undefined {
  const ev = events.find(
    (e): e is Extract<GameEvent, { type: "TriggerStorylet" }> => e.type === "TriggerStorylet",
  );
  return ev?.candidates;
}
const hasBark = (cands: Storylet[] | undefined, id: string): boolean =>
  (cands ?? []).some((s) => (s.id as string) === id);

describe("storylet ambient barks (SPEC-24)", () => {
  it("fires a precondition-gated bark once, then not again; replays identically", () => {
    const { registries, fingerprint } = loadBoth();
    const opts: GameSessionOptions = {
      seed: "barks",
      startLocationId: DISTRICT,
      startPos: { x: 50, y: 50 },
      skills: { persuade: 2, sneak: 1, force: 3, tech: 1 }, // sneak<3 so only the met_varga bark is eligible
      seedEvents: [{ type: "SetFlag", flag: MET, to: true }],
    };
    const session = new GameSession(registries, fingerprint, new InkNarrative(), opts);

    // Step 1: flag.met_varga is set and unseen -> the "known face" bark is the only eligible storylet.
    const first = triggerOf(session.step([]));
    expect(hasBark(first, "storylet.bark_known_face")).toBe(true);

    // Fire-once: its effect set flag.bark_known_face_seen, which a precondition excludes -> no re-fire.
    const second = triggerOf(session.step([]));
    expect(hasBark(second, "storylet.bark_known_face")).toBe(false);

    // Determinism: the full session (storylets included) replays to an identical hash.
    const replayed = replay(createWorld(opts), session.log, { against: fingerprint });
    expect(hash(replayed)).toBe(hash(session.world));
  });

  it("skill_at_least gates a bark (SPEC-23 passive check)", () => {
    const { registries, fingerprint } = loadBoth();
    const base = { seed: "s", startLocationId: DISTRICT, startPos: { x: 50, y: 50 } };
    const low = new GameSession(registries, fingerprint, new InkNarrative(), {
      ...base,
      skills: { sneak: 2 },
    });
    const high = new GameSession(registries, fingerprint, new InkNarrative(), {
      ...base,
      skills: { sneak: 3 },
    });
    // sneak 2 < 3 -> sneak bark not eligible (and nothing else is) ; sneak 3 >= 3 -> eligible.
    expect(hasBark(triggerOf(low.step([])), "storylet.bark_sneak_read")).toBe(false);
    expect(hasBark(triggerOf(high.step([])), "storylet.bark_sneak_read")).toBe(true);
  });
});
