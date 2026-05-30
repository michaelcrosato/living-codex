import { describe, it, expect } from "vitest";
import { hash, serialize, deserialize } from "./snapshot";
import type { World } from "./world";

// hash() works structurally on any JSON value (it sortKeys-normalizes then cyrb53-hashes the JSON).
// These tests pin the *documented* contract — order-independent for object KEYS, order-SIGNIFICANT for
// arrays — by hashing crafted values cast to World (the World type is incidental here; the structural
// behavior of sortKeys is the point, and it's the foundation of the replay invariant, ARCH §6.8).
const h = (v: unknown): string => hash(v as World);

describe("snapshot hash (replay-invariant foundation)", () => {
  it("is independent of object key insertion order (sortKeys sorts keys)", () => {
    expect(h({ a: 1, b: 2, c: 3 })).toBe(h({ c: 3, b: 2, a: 1 }));
  });

  it("is independent of NESTED object key order (sortKeys recurses into objects)", () => {
    expect(h({ outer: { x: 1, y: 2 }, z: 3 })).toBe(h({ z: 3, outer: { y: 2, x: 1 } }));
  });

  it("distinguishes structurally different states (the hash is sensitive to content)", () => {
    expect(h({ a: 1 })).not.toBe(h({ a: 2 })); // different value
    expect(h({ a: 1 })).not.toBe(h({ b: 1 })); // different key
  });

  it("preserves array order — arrays are order-significant, unlike object keys", () => {
    expect(h({ xs: [1, 2, 3] })).not.toBe(h({ xs: [3, 2, 1] }));
  });

  it("is deterministic — structurally-equal values always hash identically", () => {
    expect(h({ a: 1, nested: { b: [1, 2] } })).toBe(h({ a: 1, nested: { b: [1, 2] } }));
  });

  it("serialize/deserialize round-trips a world value", () => {
    const w = { tick: 5, flags: { x: true } } as unknown as World;
    expect(deserialize(serialize(w))).toEqual(w);
  });
});
