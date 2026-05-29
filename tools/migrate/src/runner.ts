/**
 * The versioned-migration runner now lives in engine-core (it must run at runtime too — see
 * engine-core/src/state/migrate.ts). This offline module re-exports it so existing imports and
 * future offline ContentPack/ReplayLog migrations share one implementation.
 */
export { runMigrations, type Migration } from "@codex/engine-core";
