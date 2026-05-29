import { describe, it, expect, beforeEach } from "vitest";
import {
  recordError,
  getTelemetry,
  clearTelemetry,
  mark,
  measure,
  installErrorBoundary,
} from "../src/telemetry";

describe("telemetry (offline error/timing buffer, SPEC-08)", () => {
  beforeEach(() => clearTelemetry());

  it("records errors into the ring with the current tick", () => {
    recordError("boom", "stacktrace", 7);
    expect(getTelemetry().at(-1)).toMatchObject({ kind: "error", label: "boom", tick: 7 });
  });

  it("bounds the ring buffer (oldest entries drop)", () => {
    for (let i = 0; i < 250; i++) recordError(`e${i}`);
    expect(getTelemetry().length).toBeLessThanOrEqual(200);
    expect(getTelemetry().at(-1)?.label).toBe("e249");
    expect(getTelemetry().some((e) => e.label === "e0")).toBe(false);
  });

  it("mark/measure never throw (User Timing is no-op-safe)", () => {
    expect(() => {
      mark("codex:test:start");
      measure("codex:test", "codex:test:start");
      measure("codex:missing", "never:marked"); // missing start mark must not throw
    }).not.toThrow();
  });

  it("the error boundary captures uncaught errors + rejections with the tick", () => {
    const target = new EventTarget();
    installErrorBoundary(() => 9, target);

    target.dispatchEvent(Object.assign(new Event("error"), { message: "kaboom" }));
    expect(getTelemetry().at(-1)).toMatchObject({ kind: "error", label: "kaboom", tick: 9 });

    target.dispatchEvent(
      Object.assign(new Event("unhandledrejection"), { reason: new Error("nope") }),
    );
    const last = getTelemetry().at(-1)!;
    expect(last.label).toBe("unhandledrejection");
    expect(last.detail).toContain("nope");
  });

  it("installErrorBoundary is a safe no-op when there is no event target", () => {
    expect(() => installErrorBoundary(() => 0, undefined)).not.toThrow();
  });
});
