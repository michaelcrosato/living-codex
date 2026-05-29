/**
 * World save migrations live in engine-core (runtime-usable) — see engine-core/src/state/migrate.ts.
 * Re-exported here so the offline `tools/migrate` surface and its test keep their import path.
 */
export { migrateWorld, worldMigrations } from "@codex/engine-core";
