# SPEC-10 — Durable saves + on-load schemaVersion migration

- **Status:** Todo · **Pillar:** Player Experience · **Wave:** 2 · **Priority:** P=11
- **I**=4 **F**=4 **R**=2 **Ft**=5

## Description
Saves live in IndexedDB (idb-keyval). Browser storage is **best-effort and LRU-evictable** — Safari wipes
script storage after 7 days of no interaction — so a player can silently lose progress. Two fixes:
(1) request **persistent** storage and handle quota; (2) make saves **forward-migratable** by versioning the
payload and running migrations on load. The save envelope already carries `saveVersion` + `contentFingerprint`
(WORLD_STATE §7) and `tools/migrate` exists — wire them together. (Research: [MDN quotas/eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).)

## Acceptance Criteria
- On app init (or first save), call `navigator.storage.persist()` **best-effort** (feature-detected; a denial
  or unsupported API is a logged no-op, never a crash). Surface `navigator.storage.estimate()` usage somewhere
  inspectable (HUD/console/beats).
- `QuotaExceededError` on save is caught and surfaced gracefully (a user-visible "couldn't save" message), not
  an unhandled rejection.
- **Load runs a forward migration chain:** a save with `saveVersion < current` is upgraded via `tools/migrate`
  (reuse `runMigrations` / `worldMigrations`) before the world is used; a current-version save loads unchanged;
  an *incompatible* `contentFingerprint` warns/refuses per the existing replay policy (WORLD_STATE §7.2).
- Tests (fake-indexeddb): round-trip save/load; **a prior-version save fixture migrates and loads**; a
  quota-exceeded path is handled. `engine-core` stays pure (migration lives in `tools/migrate`, called by
  `persistence`/`app-web`). `pnpm verify` green.

## Implementation approach
Read `packages/persistence/src/store.ts`, `json.ts`, `index.ts` (confirm the current `SaveEnvelope` shape and
whether `saveVersion` is written) and `tools/migrate/src/index.ts` + `world.ts`. Add a `persistRequested()`
helper (feature-detected) called from `app-web` startup. In the load path, branch on `saveVersion` and pipe
through `runMigrations`. Wrap the `set` in try/catch for `QuotaExceededError`. Add a prior-version save fixture
+ test mirroring the existing `tools/migrate` world fixture test.

## Files
- `packages/persistence/src/store.ts`, `json.ts`, `index.ts` (+ `store.test.ts`), `packages/app-web/src/main.ts`
  (startup `persist()` + quota UX). Read-only/maybe-touch: `tools/migrate/src/*`. **Collision:** `main.ts` with
  SPEC-08/SPEC-09 — sequence.

## Dependencies / prereqs
None hard. `tools/migrate` already exists (S3.2). Coordinate `main.ts`.

## Test strategy
fake-indexeddb (already a dev dep): save→load identity; old-version fixture → migrated load; mock a
`QuotaExceededError` and assert graceful handling. Manually verify in a real browser that `persist()` is
requested (DevTools → Application → Storage shows "persistent").

## Effort
M (~2.5 hr).

## Out of scope
OPFS/Storage Buckets (BACKLOG — only for large binary assets); cloud save/sync; encryption; auto-save cadence
redesign.
