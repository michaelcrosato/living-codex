import { describe, it, expect } from "vitest";
import { FlagId, LocationId } from "@codex/content-schema";
import { createWorld } from "./state/world";
import { tick, type System } from "./tick";

const START = LocationId.parse("location.start");

describe("tick (the deterministic loop, WORLD_STATE.md §8)", () => {
  it("advances the tick counter and logs inputs even with no systems", () => {
    const w = createWorld({ seed: "s", startLocationId: START });
    const result = tick(w, [{ type: "Move", dir: { x: 1, y: 0 } }], [], 1 / 60);
    expect(result.world.tick).toBe(1);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({ kind: "input", tick: 0 });
  });

  it("runs systems in order, applies their events, and logs them", () => {
    const flag = FlagId.parse("flag.sys");
    const sys: System = () => [{ type: "SetFlag", flag, to: true }];
    const w = createWorld({ seed: "s", startLocationId: START });
    const result = tick(w, [], [sys], 1 / 60);
    expect(result.world.flags[flag]).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.entries.filter((e) => e.kind === "event")).toHaveLength(1);
    expect(result.world.tick).toBe(1);
  });

  it("does not mutate the input world", () => {
    const w = createWorld({ seed: "s", startLocationId: START });
    const before = JSON.stringify(w);
    tick(w, [], [() => [{ type: "SetFlag", flag: FlagId.parse("flag.x"), to: 1 }]], 1 / 60);
    expect(JSON.stringify(w)).toBe(before);
  });
});
