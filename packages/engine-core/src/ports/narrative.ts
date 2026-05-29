/**
 * The Narrative port (ARCHITECTURE.md §5). Defined HERE in engine-core (zero dependencies);
 * the implementation lives in narrative-ink, which depends on these types — never the other
 * way round. The engine speaks to branching dialogue only through this interface, so the Ink
 * vendor stays isolated and swappable.
 *
 * Determinism reconciliation (WORLD_STATE.md §4): Ink has its OWN internal RNG. `save()`
 * captures full Ink state on every choice and that snapshot lands in the event log; replay
 * RESTORES it via `load()` and never re-runs Ink. So Ink's RNG is irrelevant to replay.
 */
export type CompiledInk = unknown; // opaque inkjs compiled JSON; shape owned by the adapter

export interface Choice {
  index: number;
  text: string;
}

export interface StoryFrame {
  text: string;
  tags: string[];
  choices: Choice[];
}

export interface StorySession {
  /** Continue the story to the next choice point and report current text/tags/choices. */
  current(): StoryFrame;
  choose(choiceIndex: number): void;
  getVar(name: string): string | number | boolean;
  setVar(name: string, value: string | number | boolean): void;
  /** Serialize FULL Ink state (inkjs state.toJson) — captured into the event log. */
  save(): string;
  /** Restore Ink state verbatim; never recompute. */
  load(serialized: string): void;
}

export interface Narrative {
  load(compiled: CompiledInk): StorySession;
}
