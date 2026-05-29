/**
 * Offline-first, network-free observability for the app shell (SPEC-08). Errors land in a bounded
 * in-memory ring (inspectable, exportable with a bug report); timings go to the User Timing API for
 * DevTools. There is NO network and NO SaaS RUM — that would break the offline/deterministic
 * guarantees. engine-core stays pure; all of this is app-only and reads the clock for display only
 * (it never feeds simulation state).
 */
export interface TelemetryEntry {
  /** wall-clock ms (display only — never an input to the deterministic sim) */
  at: number;
  kind: "error";
  label: string;
  detail?: string;
  tick?: number;
}

const RING_MAX = 200;
const ring: TelemetryEntry[] = [];

export function getTelemetry(): readonly TelemetryEntry[] {
  return ring;
}

export function clearTelemetry(): void {
  ring.length = 0;
}

export function recordError(label: string, detail?: string, tick?: number): void {
  ring.push({
    at: Date.now(),
    kind: "error",
    label,
    ...(detail !== undefined ? { detail } : {}),
    ...(tick !== undefined ? { tick } : {}),
  });
  if (ring.length > RING_MAX) ring.shift();
}

const perf: Performance | undefined = typeof performance !== "undefined" ? performance : undefined;

/** A User Timing mark (visible in DevTools Performance). No-op-safe; pure measurement. */
export function mark(name: string): void {
  perf?.mark?.(name);
}

/** Measure from a prior mark to now (User Timing). Never throws if the start mark is missing. */
export function measure(name: string, startMark: string): void {
  try {
    perf?.measure?.(name, startMark);
  } catch {
    // a missing/cleared start mark must never crash the frame loop
  }
}

function errorText(err: unknown): string {
  return err instanceof Error ? (err.stack ?? err.message) : String(err ?? "");
}

/**
 * Install a top-level error boundary that records uncaught errors / rejections into the ring with
 * the current tick (so a bug report says *when* it happened). `target` defaults to `window`;
 * tests pass their own EventTarget. A no-op where there is no event target.
 */
export function installErrorBoundary(
  getTick: () => number,
  target: Pick<EventTarget, "addEventListener"> | undefined = typeof window !== "undefined"
    ? window
    : undefined,
): void {
  if (!target) return;
  target.addEventListener("error", (e: Event) => {
    const ev = e as ErrorEvent;
    recordError(ev.message || "error", errorText(ev.error), getTick());
  });
  target.addEventListener("unhandledrejection", (e: Event) => {
    const ev = e as PromiseRejectionEvent;
    recordError("unhandledrejection", errorText(ev.reason), getTick());
  });
}
