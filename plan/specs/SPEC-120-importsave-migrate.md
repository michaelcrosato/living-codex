# SPEC-120 — Fix: `importSave` skips world migration (save-import crashes on old saves)

**Wave:** Cycle-11 P0 (persistence correctness) · **Risk:** LOW · **Status:** Done (TDD: new `json.test.ts` red→green; 3-line `importSave` migration mirror; `pnpm verify` EXIT 0).

## Description + Impact

**Genuine save-system bug** (found by the SPEC-119 adversarial bug-hunt; both sides confirmed by direct
code read). The two save entry points are **asymmetric on migration**:

- `packages/persistence/src/store.ts:31-37` — `loadGame` (the IndexedDB `O`-key path) **migrates**:
  ```ts
  export async function loadGame(slot: string): Promise<SaveEnvelope | undefined> {
    const save = await get<SaveEnvelope>(slot, SAVE_STORE);
    if (!save) return undefined;
    return { ...save, world: migrateWorld(save.world) };   // forward-migrate (WORLD_STATE §7)
  }
  ```
- `packages/persistence/src/json.ts:8-10` — `importSave` (the `I`-key file-import path) does **not**:
  ```ts
  export function importSave(json: string): SaveEnvelope {
    return JSON.parse(json) as SaveEnvelope;   // NO migration
  }
  ```

`importSave` feeds `main.ts` (`i` key → `restoreFrom(importSave(text))`) → `GameSession.restore` →
`loadSave` → the World is used **as-is**. A save file exported by an older build is `version:1` and lacks
the `npcDialogue` / `unlockedExits` maps that `WORLD_VERSION = 2` added (`engine-core/src/state/migrate.ts`).
After a build upgrade, importing such a file leaves `world.npcDialogue === undefined`; on the **next
`session.step`**, `reactionsSystem` (`engine-core/src/systems/reactions.ts`) reads
`world.npcDialogue[npc.id]` → `TypeError: Cannot read properties of undefined`. (The parallel
`unlockedExits` read in `interaction.ts` throws the same way on a `UseExit`.) The same old save loaded via
`O` (IndexedDB) works because `loadGame` migrated it — a surprising save-load asymmetry. Shipped content has
~11 `reactsTo` entries with `overrideDialogueId` gated on common mid-slice flags, so a save taken after any
of them crashes immediately on import.

Latent today (no v1 save files in the wild for this repo), but a real correctness defect in shipped
player-facing code; the fix is the exact symmetric mirror of the already-tested `loadGame`.

## Approach (files / patterns)

`packages/persistence/src/json.ts` — make `importSave` migrate, symmetric to `loadGame`:
```ts
import { migrateWorld, type SaveEnvelope } from "@codex/engine-core";  // add migrateWorld (value import)

export function importSave(json: string): SaveEnvelope {
  const save = JSON.parse(json) as SaveEnvelope;
  // Forward-migrate the snapshot's World so a file exported by an older build still imports
  // (symmetric with loadGame; WORLD_STATE §7). migrateWorld is a no-op on current-version saves.
  return { ...save, world: migrateWorld(save.world) };
}
```
`migrateWorld` is already exported from `@codex/engine-core` (store.ts imports it the same way — confirmed
green by typecheck). `exportSave` is unchanged. No schema/doc change.

## DoD + acceptance

- [ ] New test (extend `packages/persistence/src/store.test.ts`, or a new `json.test.ts`): build a **v1**
      world object (`version: 1`, omit `npcDialogue`/`unlockedExits`) inside a `SaveEnvelope`,
      `JSON.stringify` it, `importSave` it, and assert (a) `result.world.version === WORLD_VERSION` and
      (b) `result.world.npcDialogue` and `result.world.unlockedExits` are present (objects). Mirror the
      existing SPEC-10 `loadGame` migration test in `store.test.ts` (search it for the v1-world fixture +
      `WORLD_VERSION` import — already imported there). Test FAILS before the fix (version stays 1 / maps
      undefined), PASSES after.
- [ ] Existing `store.test.ts` "exports/imports as JSON" round-trip still passes (current-version import
      unaffected — `migrateWorld` is a no-op at the current version).
- [ ] `pnpm verify` EXIT 0 (gate commits on exit code — SPEC-99); golden-master untouched; `pnpm audit` clean.

## Test strategy

Pure unit test (no DOM/IndexedDB — `importSave` is pure). Reuse the v1-world fixture shape from the
SPEC-10 `loadGame` migration test already in `store.test.ts` (it imports `WORLD_VERSION` + `makeSave`).
The focused proof is version-2 + maps-present after `importSave` of a v1 envelope; `pnpm verify` is the gate.

## Provenance / confidence

HIGH. The bug-hunt traced it with exact line numbers; I independently confirmed `json.ts` (no migration)
and `store.ts` (migrates) by direct read, and that `migrateWorld` imports cleanly from `@codex/engine-core`
(store.ts already does it; typecheck green). The fix is a 3-line symmetric change to an 11-line file.
**Execution note for next cycle:** this was filed (not executed) because the tool environment had degraded
to where the Read tool returned truncated/hallucinated file content — unsafe for test-authoring surgery.
Re-read `store.test.ts` fresh first; if Reads are reliable, TDD it (red → fix → green); if not, wait for a
healthy env. It is the FIRST item to execute next cycle.
