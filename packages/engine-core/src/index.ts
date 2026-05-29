// engine-core — the pure simulation. Public API surface only (re-exports).
// Read this file first (ARCHITECTURE.md §3). Depends on content-schema ONLY.

// determinism primitives
export * from "./time/rng";
export * from "./time/clock";

// state
export * from "./state/world";
export * from "./state/snapshot";
export * from "./state/migrate";

// events + replay
export * from "./events/event";
export * from "./events/apply";
export * from "./events/effects";
export * from "./events/log";

// the tick loop
export * from "./tick";

// derived query layer + the condition language
export * from "./ecs/components";
export * from "./ecs/registry";
export * from "./conditions/conditions";

// ports (interfaces the app injects implementations for)
export * from "./ports/narrative";
export * from "./ports/renderer";
export * from "./ports/audio";

// systems
export * from "./systems/movement";
export * from "./systems/interaction";
export * from "./systems/quests";
export * from "./systems/combat";
export * from "./systems/dialogue";
export * from "./systems/reactions";
export * from "./systems/bribe";
