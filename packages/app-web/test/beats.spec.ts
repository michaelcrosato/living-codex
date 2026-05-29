import { describe, it, expect } from "vitest";
import { createWorld, applyEvents, type GameEvent } from "@codex/engine-core";
import { LocationId, FlagId } from "@codex/content-schema";
import { beats } from "../src/beats";

const START = LocationId.parse("location.ashfall_district");
const set = (flag: string): GameEvent => ({ type: "SetFlag", flag: FlagId.parse(flag), to: true });

describe("beat instrumentation (T-15)", () => {
  it("a fresh world has reached no beats", () => {
    expect(beats(createWorld({ seed: "s", startLocationId: START }))).toEqual({
      metStranger: false,
      metVarga: false,
      acceptedQuest: false,
      solved: false,
      sawConsequence: false,
    });
  });

  it("derives beats from world flags", () => {
    const w = applyEvents(createWorld({ seed: "s", startLocationId: START }), [
      set("flag.met_stranger"),
      set("flag.met_varga"),
      set("flag.has_drive"),
      set("flag.syndicate_marked"),
    ]);
    const b = beats(w);
    expect(b.metStranger).toBe(true);
    expect(b.metVarga).toBe(true);
    expect(b.solved).toBe(true);
    expect(b.sawConsequence).toBe(true);
  });
});
