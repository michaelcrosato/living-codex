import type { World } from "./world";

/**
 * serialize / deserialize / hash for `World` (ARCHITECTURE.md §3). Because `World` is flat
 * JSON (WORLD_STATE.md §6) these are trivial and total. `hash` uses a key-sorted encoding so
 * two structurally-equal worlds always hash identically regardless of key insertion order —
 * the foundation of the replay invariant (ARCHITECTURE.md §6.8).
 */
export function serialize(world: World): string {
  return JSON.stringify(world);
}

export function deserialize(json: string): World {
  return JSON.parse(json) as World;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) out[key] = sortKeys(record[key]);
    return out;
  }
  return value;
}

function cyrb53(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return combined.toString(16).padStart(14, "0");
}

export function hash(world: World): string {
  return cyrb53(JSON.stringify(sortKeys(world)));
}
