import type { ContentFingerprint } from "@codex/content-schema";
import type { World } from "../state/world";
import type { GameEvent, InputEvent } from "./event";
import { applyEvent } from "./apply";
import { hash } from "../state/snapshot";

/**
 * The save & replay envelope (WORLD_STATE.md §7). The replay log records both inputs and the
 * events they produced; replay re-applies the CAPTURED events (it does not re-run systems or
 * Ink — §4), which is what makes replay deterministic and content-version-aware.
 */
export const REPLAY_SCHEMA_VERSION = 1;
export const SAVE_VERSION = 1;
export const ENGINE_VERSION = "0.1.0";

export type ReplayEntry =
  | { tick: number; kind: "input"; input: InputEvent }
  | { tick: number; kind: "event"; event: GameEvent };

export interface ReplayLog {
  schemaVersion: number;
  engineVersion: string;
  contentFingerprint: ContentFingerprint;
  seed: string;
  entries: ReplayEntry[];
}

export interface SaveEnvelope {
  saveVersion: number;
  engineVersion: string;
  contentFingerprint: ContentFingerprint;
  /** A snapshot — NOT necessarily t=0 (WORLD_STATE.md §7 rule 1). */
  world: World;
  /** Replay only from the snapshot, not from dawn. */
  logSinceSnapshot: ReplayEntry[];
}

export function createLog(seed: string, contentFingerprint: ContentFingerprint): ReplayLog {
  return {
    schemaVersion: REPLAY_SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    contentFingerprint,
    seed,
    entries: [],
  };
}

export function appendEvent(log: ReplayLog, tick: number, event: GameEvent): void {
  log.entries.push({ tick, kind: "event", event });
}

export interface ReplayOptions {
  /** The currently-loaded content fingerprint; replay is content-version-relative (§7). */
  against?: ContentFingerprint;
  /** What to do when the log's fingerprint doesn't match `against`. Default: throw. */
  onMismatch?: "throw" | "ignore";
}

/**
 * Replay a log onto a known initial snapshot, re-applying captured events in order. Pure:
 * `initial` is never mutated (applyEvent returns new state). Refuses (or, with
 * `onMismatch:"ignore"`, proceeds past) a content fingerprint mismatch (§7 rule 2).
 */
export function replay(initial: World, log: ReplayLog, opts: ReplayOptions = {}): World {
  if (initial.seed !== log.seed) {
    throw new Error(`replay: seed mismatch (initial "${initial.seed}" vs log "${log.seed}").`);
  }
  const against = opts.against;
  if (against && against.registriesHash !== log.contentFingerprint.registriesHash) {
    if ((opts.onMismatch ?? "throw") === "throw") {
      throw new Error(
        `replay: content fingerprint mismatch — log was recorded against ` +
          `${log.contentFingerprint.registriesHash}, current is ${against.registriesHash}.`,
      );
    }
  }
  let world = initial;
  for (const entry of log.entries) {
    if (entry.kind === "event") world = applyEvent(world, entry.event);
  }
  return world;
}

export interface TickHash {
  tick: number;
  hash: string;
}

/**
 * Like `replay`, but capture a per-step state hash so a divergence can be bisected to the exact
 * step (the standard deterministic-replay debugging tool). Pure; computed on demand — it is NOT
 * stored in the shipped `ReplayLog`. The trace starts with the initial snapshot, then records one
 * `{ tick, hash }` after each applied event (tick taken from the log entry).
 */
export function replayTrace(initial: World, log: ReplayLog): TickHash[] {
  if (initial.seed !== log.seed) {
    throw new Error(`replayTrace: seed mismatch (initial "${initial.seed}" vs log "${log.seed}").`);
  }
  const trace: TickHash[] = [{ tick: initial.tick, hash: hash(initial) }];
  let world = initial;
  for (const entry of log.entries) {
    if (entry.kind === "event") {
      world = applyEvent(world, entry.event);
      trace.push({ tick: entry.tick, hash: hash(world) });
    }
  }
  return trace;
}

/**
 * The first step at which two traces differ (by tick or hash), or `null` if identical. Turns a
 * bare end-of-replay hash mismatch into "diverged at tick N", so a determinism regression is
 * localized instead of merely detected.
 */
export function firstDivergence(
  a: readonly TickHash[],
  b: readonly TickHash[],
): { index: number; tick: number; a?: TickHash; b?: TickHash } | null {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i]!.tick !== b[i]!.tick || a[i]!.hash !== b[i]!.hash) {
      return { index: i, tick: a[i]!.tick, a: a[i]!, b: b[i]! };
    }
  }
  if (a.length !== b.length) {
    const present = (a[n] ?? b[n])!; // exactly one side ran out; the other has an element here
    return {
      index: n,
      tick: present.tick,
      ...(a[n] ? { a: a[n] } : {}),
      ...(b[n] ? { b: b[n] } : {}),
    };
  }
  return null;
}

export function makeSave(
  world: World,
  logSinceSnapshot: ReplayEntry[],
  contentFingerprint: ContentFingerprint,
): SaveEnvelope {
  return {
    saveVersion: SAVE_VERSION,
    engineVersion: ENGINE_VERSION,
    contentFingerprint,
    world,
    logSinceSnapshot,
  };
}

/** Load a save: restore the snapshot, then replay only the tail (WORLD_STATE.md §7 rule 1). */
export function loadSave(save: SaveEnvelope): World {
  let world = save.world;
  for (const entry of save.logSinceSnapshot) {
    if (entry.kind === "event") world = applyEvent(world, entry.event);
  }
  return world;
}
