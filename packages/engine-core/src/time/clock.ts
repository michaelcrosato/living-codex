/**
 * Fixed-timestep clock (ARCHITECTURE.md §6.2). The simulation advances in fixed `dt`
 * steps; rendering interpolates but never drives state. Pure: given the same inputs it
 * always yields the same number of steps. No Date.now anywhere — wall-clock time enters
 * only as the `frameMs` argument supplied by the (impure) shell.
 */

export const TICK_HZ = 60;
export const TICK_MS = 1000 / TICK_HZ;

/** Guard against the "spiral of death": never run more than this many steps per frame. */
export const MAX_STEPS_PER_FRAME = 8;

export interface FixedStep {
  /** How many fixed simulation steps to run this frame. */
  steps: number;
  /** Leftover time carried into the next frame. */
  accumulatorMs: number;
}

/**
 * Accumulate real elapsed time and report how many fixed steps are due.
 * Deterministic in (accumulatorMs, frameMs, tickMs).
 */
export function accumulate(
  accumulatorMs: number,
  frameMs: number,
  tickMs: number = TICK_MS,
): FixedStep {
  let acc = accumulatorMs + frameMs;
  let steps = 0;
  while (acc >= tickMs && steps < MAX_STEPS_PER_FRAME) {
    acc -= tickMs;
    steps += 1;
  }
  return { steps, accumulatorMs: acc };
}
