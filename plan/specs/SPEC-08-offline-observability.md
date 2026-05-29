# SPEC-08 — Offline-safe observability (User Timing + error boundary)

- **Status:** Todo · **Pillar:** Quality/Observability · **Wave:** 2 · **Priority:** P=9
- **I**=3 **F**=4 **R**=2 **Ft**=4

## Description
The app has lightweight `beats` instrumentation but no performance timing or error capture. Add **offline-first**
observability that never makes a network call and never touches `engine-core`'s purity/determinism: User Timing
marks around the hot phases, and a top-level error boundary that records into the local beats buffer (optionally
exportable with the save). Avoid SaaS/RUM session-replay (network-coupled, anti-offline). (Research:
[web-vitals](https://github.com/GoogleChrome/web-vitals), User Timing API.)

## Acceptance Criteria
- `performance.mark`/`performance.measure` wrap the key per-frame phases in `app-web` (e.g. `sim.step`,
  `scene.draw`, `dialogue.advance`) so they show in DevTools Performance; measurement only — **no effect on
  simulation state or determinism** (marks read the clock, never feed it back).
- A top-level `window.addEventListener('error', …)` + `'unhandledrejection'` boundary records structured entries
  into the existing beats buffer (timestamp, message, stack, current `world.tick`); the app degrades gracefully
  rather than dying silently.
- Optional: `web-vitals` (INP/LCP) wired to a **local callback** that buffers in beats — **only if** it adds no
  network dependency and stays <~2KB; otherwise skip and note it. **No telemetry backend.**
- `engine-core` untouched (purity preserved); all changes in `app-web`. `pnpm verify` green; `pnpm e2e` green.
- Beats buffer (with errors/timings) is includable in the JSON save export for offline bug reports.

## Implementation approach
Read `packages/app-web/src/beats.ts`, `main.ts`, `scene.ts`, `session.ts`. Add a tiny `perf.ts` helper
(mark/measure wrappers that no-op if `performance` is absent — keeps node tests happy). Register the error
boundary in `main.ts` startup; route into `beats`. If adding web-vitals, import its tree-shaken fns and pass a
buffering callback. Keep the buffer bounded (ring buffer) so it can't grow unbounded.

## Files
- `packages/app-web/src/beats.ts` (+ test), a new `perf.ts`, `main.ts`. **Collision:** `main.ts` shared with
  SPEC-09/SPEC-10 — sequence. Optional dev/runtime dep `web-vitals` (justify in commit if added).

## Dependencies / prereqs
None hard. Coordinate `main.ts`.

## Test strategy
JSDOM/Vitest: dispatch a synthetic `error`/`unhandledrejection` and assert a beats entry is recorded with the
tick; assert marks/measures are created after a step (mock `performance`). Manually open DevTools Performance and
confirm the marks appear during play.

## Effort
S–M (~2 hr).

## Out of scope
SaaS RUM/session-replay; a telemetry backend; sending anything over the network; instrumenting engine-core
(must stay pure — time it from the app side).
