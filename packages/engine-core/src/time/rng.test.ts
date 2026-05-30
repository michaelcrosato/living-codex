import { describe, it, expect } from "vitest";
import {
  seedRng,
  nextUint32,
  nextFloat,
  nextInt,
  serializeRng,
  deserializeRng,
  RngCursor,
} from "./rng";

describe("rng", () => {
  it("same seed produces an identical sequence", () => {
    const a = new RngCursor(seedRng("ashfall"));
    const b = new RngCursor(seedRng("ashfall"));
    const seqA = Array.from({ length: 50 }, () => a.int(1, 20));
    const seqB = Array.from({ length: 50 }, () => b.int(1, 20));
    expect(seqA).toEqual(seqB);
  });

  it("different seeds diverge", () => {
    const a = new RngCursor(seedRng("ashfall"));
    const b = new RngCursor(seedRng("ashfall2"));
    const seqA = Array.from({ length: 50 }, () => a.float());
    const seqB = Array.from({ length: 50 }, () => b.float());
    expect(seqA).not.toEqual(seqB);
  });

  it("nextFloat stays in [0, 1)", () => {
    let state = seedRng("range");
    for (let i = 0; i < 1000; i++) {
      const r = nextFloat(state);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      state = r.next;
    }
  });

  it("nextInt is inclusive and within bounds", () => {
    let state = seedRng("dice");
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const r = nextInt(state, 1, 20);
      expect(r.value).toBeGreaterThanOrEqual(1);
      expect(r.value).toBeLessThanOrEqual(20);
      seen.add(r.value);
      state = r.next;
    }
    // a d20 rolled 5000 times should produce both endpoints
    expect(seen.has(1)).toBe(true);
    expect(seen.has(20)).toBe(true);
  });

  it("is purely functional — the same state always yields the same value", () => {
    const s = seedRng("pure");
    expect(nextUint32(s).value).toBe(nextUint32(s).value);
  });

  it("serialize/deserialize round-trips and resumes the stream", () => {
    let state = seedRng("resume");
    for (let i = 0; i < 7; i++) state = nextUint32(state).next;
    const frozen = deserializeRng(serializeRng(state));
    expect(frozen).toEqual(state);
    // resuming from the restored state matches continuing the original
    expect(nextInt(frozen, 1, 100).value).toBe(nextInt(state, 1, 100).value);
  });

  it("rejects malformed serialized state (every validation arm — corrupt-save boundary)", () => {
    expect(() => deserializeRng('"nope"')).toThrow(); // not an array
    expect(() => deserializeRng("[1,2,3]")).toThrow(); // wrong length (3 ≠ 4)
    expect(() => deserializeRng("[1,2,3,4,5]")).toThrow(); // wrong length (5 ≠ 4)
    expect(() => deserializeRng('[1,2,3,"x"]')).toThrow(); // a non-number element
    expect(() => deserializeRng("[1,2,3,null]")).toThrow(); // null is typeof "object", not number
    expect(() => deserializeRng("[1,2,3,1e999]")).toThrow(); // parses to Infinity → not finite
  });
});
