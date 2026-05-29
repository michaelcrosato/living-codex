/**
 * The single source of randomness for the entire game (ARCHITECTURE.md §6.1).
 *
 * Purely functional: the RNG is a *value* (`RngState`), never a stateful object stored
 * in `World`. `World` persists only the serialized state string, so the flat-data rule
 * (WORLD_STATE.md §6) holds and replay can resume mid-stream. Algorithm is sfc32 seeded
 * via cyrb128 — fast, well-distributed, 128-bit state, fully deterministic.
 */

export type RngState = readonly [number, number, number, number];

/** Derive a 128-bit state from an arbitrary seed string (cyrb128). */
export function seedRng(seed: string): RngState {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

/** Advance the state once, returning a uint32 value and the next state (sfc32). */
export function nextUint32(state: RngState): { value: number; next: RngState } {
  let a = state[0] | 0;
  let b = state[1] | 0;
  let c = state[2] | 0;
  let d = state[3] | 0;
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  return { value: t >>> 0, next: [a, b, c, d] };
}

/** A float in [0, 1). */
export function nextFloat(state: RngState): { value: number; next: RngState } {
  const { value, next } = nextUint32(state);
  return { value: value / 4294967296, next };
}

/** An integer in [min, max] inclusive (min/max are clamped to integers). */
export function nextInt(
  state: RngState,
  min: number,
  max: number,
): { value: number; next: RngState } {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  const span = hi - lo + 1;
  const { value, next } = nextFloat(state);
  return { value: lo + Math.floor(value * span), next };
}

export function serializeRng(state: RngState): string {
  return JSON.stringify(state);
}

export function deserializeRng(serialized: string): RngState {
  const parsed = JSON.parse(serialized) as unknown;
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 4 ||
    parsed.some((n) => typeof n !== "number" || !Number.isFinite(n))
  ) {
    throw new Error(`invalid RngState: ${serialized}`);
  }
  return [parsed[0], parsed[1], parsed[2], parsed[3]] as RngState;
}

/**
 * A transient, mutable cursor for ergonomic RNG use *within a single fold step*.
 * It is never stored in `World`; callers read `.state` back out and persist the
 * serialized form. This keeps call sites readable without violating flat-data.
 */
export class RngCursor {
  private current: RngState;
  constructor(state: RngState) {
    this.current = state;
  }
  get state(): RngState {
    return this.current;
  }
  float(): number {
    const { value, next } = nextFloat(this.current);
    this.current = next;
    return value;
  }
  int(min: number, max: number): number {
    const { value, next } = nextInt(this.current, min, max);
    this.current = next;
    return value;
  }
}
