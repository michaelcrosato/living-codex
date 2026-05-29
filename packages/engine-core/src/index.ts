// engine-core — the pure simulation. Public API surface only (re-exports).
// Read this file first (ARCHITECTURE.md §3). Depends on content-schema ONLY.

// determinism primitives
export * from "./time/rng";
export * from "./time/clock";

// state
export * from "./state/world";
export * from "./state/snapshot";

// events + replay
export * from "./events/event";
export * from "./events/apply";
export * from "./events/log";

// the tick loop
export * from "./tick";

// derived query layer + the condition language
export * from "./ecs/components";
export * from "./ecs/registry";
export * from "./conditions/conditions";

// systems
export * from "./systems/movement";
export * from "./systems/interaction";
