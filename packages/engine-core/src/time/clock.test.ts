import { describe, it, expect } from "vitest";
import { accumulate, TICK_MS, MAX_STEPS_PER_FRAME } from "./clock";

describe("clock (fixed timestep)", () => {
  it("one exact tick yields one step and no remainder", () => {
    const r = accumulate(0, TICK_MS);
    expect(r.steps).toBe(1);
    expect(r.accumulatorMs).toBeCloseTo(0, 10);
  });

  it("carries sub-tick remainder forward (stable dt)", () => {
    // ~60fps frame is slightly longer than a tick; over time steps stay ~1/frame.
    let acc = 0;
    let total = 0;
    for (let i = 0; i < 600; i++) {
      const r = accumulate(acc, 16.6667);
      total += r.steps;
      acc = r.accumulatorMs;
    }
    // 600 frames * 16.6667ms = 10000ms => ~600 ticks of 16.6667ms
    expect(total).toBeGreaterThanOrEqual(595);
    expect(total).toBeLessThanOrEqual(605);
  });

  it("clamps runaway frames to avoid the spiral of death", () => {
    const r = accumulate(0, 100_000);
    expect(r.steps).toBe(MAX_STEPS_PER_FRAME);
  });

  it("is deterministic in its inputs", () => {
    expect(accumulate(3, 20)).toEqual(accumulate(3, 20));
  });
});
