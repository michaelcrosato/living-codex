import type { ContentFingerprint } from "@codex/content-schema";
import type { World } from "../state/world";
import type { GameEvent, InputEvent } from "./event";
import { applyEvent } from "./apply";

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

export function appendInput(log: ReplayLog, tick: number, input: InputEvent): void {
  log.entries.push({ tick, kind: "input", input });
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
