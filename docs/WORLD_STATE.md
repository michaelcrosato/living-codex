# WORLD_STATE.md — The Runtime State Contract

This file makes the runtime state **explicit before T-04**, so the agent does not invent incompatible structures across movement, quests, dialogue, persistence, and replay. It is the precise definition of everything `ARCHITECTURE.md` and `TICKETS.md` refer to as "the World," "the event log," and "replay."

Subordinate to `GOAL.md`. Pairs with `SCHEMA.md` (static content) — this file is the **mutable** half: static content lives in Registries; per-player progress lives in `World`. Keep that split clean (`ARCHITECTURE.md §4`).

---

## 1. The `World` shape (authoritative source of truth)

`World` is plain, serializable JSON — no class instances, Maps, Sets, functions, or closures (see §6, the flat-data rule). It is the **only** authoritative state. Everything else (ECS queries, render intents) is derived from it.

```ts
interface World {
  version: number;                 // World schema version (currently 2; for migration, §7)
  seed: string;                    // master seed; the ONLY entropy origin
  rngState: string;                // serialized PRNG state (so replay resumes mid-stream)
  tick: number;                    // monotonic fixed-timestep counter

  player: CharacterState;          // the player character (see §3)

  locationId: LocationId;          // where the player currently is
  entities: Record<EntityId, Entity>;   // dynamic entities (NPC instances, etc.)

  flags: Record<FlagId, boolean | number | string>;
  inventory: Record<ItemId, number>;        // count by item; never negative (§5)
  reputation: Record<FactionId, number>;    // standing; clamped to [-100, 100] (§5)

  quests: Record<QuestId, QuestRuntimeState>;        // see §2
  dialogue: Record<DialogueId, SerializedDialogueState>;  // see §4

  // Added in v2 (NPC reactions / set_npc_dialogue / unlock_exit effects):
  npcDialogue: Record<NpcId, DialogueId>;    // NPC -> override dialogue (reactsTo or set_npc_dialogue)
  unlockedExits: Record<string, boolean>;    // "locationId#exitIndex" -> true once unlock_exit fires
}
```

`Entity` is the dynamic, per-instance state of something in the world (an NPC's current position/hp), distinct from its static definition in a Registry:

```ts
interface Entity {
  id: EntityId;
  defId: NpcId | string;     // points to the static definition in a Registry
  locationId: LocationId;
  pos: { x: number; y: number };
  hp?: number;               // present only for combatant entities
  alive: boolean;
}
```

> **Static vs. runtime, stated once:** an NPC's name, bio, appearance, base dialogue → Registry (static, `SCHEMA.md`). An NPC instance's position, hp, alive-state → `World.entities` (runtime, here). Faction *definitions* → Registry; faction *standing* → `World.reputation`. Dialogue *script* → Registry (`DialogueAsset`); dialogue *progress* → `World.dialogue`.

---

## 2. Quest runtime semantics (settles T-08 ambiguity)

Authoring data is in `SCHEMA.md`. The **runtime** behavior is defined here so the agent doesn't improvise it.

```ts
interface QuestRuntimeState {
  status: "unoffered" | "offered" | "active" | "completed" | "failed";
  activeBranchIds: string[];          // branches the player is currently pursuing
  completedBranchId?: string;         // the branch that completed it, if any
  objectiveProgress: Record<string, ObjectiveRuntimeState>;  // keyed by branch.id + objective index
  appliedEffectIds: string[];         // idempotency guard (see rules)
}

interface ObjectiveRuntimeState {
  done: boolean;
  failed: boolean;                    // for skill_check failure, see §3.2
  attempts: number;
}
```

**Rules (these are the contract for T-08):**
1. **Objectives within a branch are ordered by default.** An objective becomes checkable only when the previous one is `done`. (A future schema flag could allow unordered branches; not in the slice.)
2. **Multiple branches may be *active* at once** (the player hasn't committed), but **only one branch completes a quest.** The first branch to satisfy all its objectives wins; other branches close.
3. **Completion is atomic and idempotent.** On completion, apply in this exact order, exactly once: branch `onComplete` → quest `onAnyComplete` → `rewards`. Each effect is recorded in `appliedEffectIds`; replaying never double-applies.
4. **Rewards apply at completion**, not at objective ticks.
5. **A quest enters `failed`** only if all branches become impossible (see §3.2 for how a skill check can foreclose a branch) — otherwise it stays `active`. Failure is a real state, not an absence.

---

## 3. The player / character model (closes the agency gap)

Half the quest verbs (`skill_check`) reference skills. Without a character model they resolve against nothing — a coin flip. This model makes "the talk solution draws on what you learned in the bar" *mechanically true*.

### 3.1 CharacterState
```ts
interface CharacterState {
  entityId: EntityId;
  skills: Record<SkillId, number>;     // persuade, sneak, force, tech → integer levels
  conditionMods: Record<SkillId, number>;  // temporary modifiers from world state
}
type SkillId = "persuade" | "sneak" | "force" | "tech";
```

Skills are low integers (slice range ~0–5). `conditionMods` is how *learning something in the bar* helps: a flag set by a patron's dialogue grants e.g. `+2 persuade` against the guard, applied as a modifier. This is data-driven via a new effect (see SCHEMA change list).

### 3.2 Skill-check resolution (deterministic)
```
roll        = rng.int(1..20)                       // the ONE engine RNG
total       = roll + skills[skill] + conditionMods[skill]
outcome     = total >= dc ? "success" : "failure"
```
- The roll uses the single seeded engine RNG, so it is replay-stable.
- **Failure is first-class.** A `skill_check` objective that fails sets `failed = true` and triggers the objective's/branch's `onFail` effects (new schema field). Depending on authored `onFail`, failure may: foreclose that branch, fall through to another branch (e.g. failed persuade → combat available), set a suspicion flag, or change a later line. Failure is never a silent dead-end.
- **Retry policy is authored:** an objective may declare `retryable: false` (default) so a blown check commits the consequence — which is where tension lives.

---

## 4. Dialogue state & the Ink determinism reconciliation (critical)

Ink is a second state machine with **its own internal RNG** (Ink's `RANDOM()`, shuffles). This conflicts with the "one RNG" rule and would silently break replay, because replay folds *engine* events and does not re-run Ink.

**Resolution (authoritative — overrides any looser wording elsewhere):**

- Dialogue progress is stored as a **serialized Ink state snapshot**, not recomputed:
  ```ts
  type SerializedDialogueState = string;   // inkjs StorySession.save() output (state.toJson)
  ```
- On **every choice**, the engine emits a `DialogueAdvanced` event whose payload includes the **post-choice serialized Ink state**. That snapshot is what lands in the event log.
- **Replay restores Ink state from the snapshot; it never re-runs Ink to recompute it.** This makes Ink's internal RNG irrelevant to determinism — we capture results, not recompute them.
- Any randomness Ink needs is therefore captured-by-snapshot. We do **not** rely on seeding Ink's PRNG.
- Story variables that gate engine logic are mirrored into `World.flags` as part of applying `DialogueAdvanced` (so `conditions` can read them).

This is the single most important determinism fix in the package. The `narrative-ink` adapter must expose `save()`/`load()` and the dialogue system must snapshot on every advance.

---

## 5. Conservation & bounds (makes the invariant tests real)

`AGENTS.md` asks for "credits are conserved" tests; those need enforceable rules:
- **Inventory never goes negative.** `give_item` with a negative count that would underflow is rejected at `applyEvent` time (and content schema forbids non-positive counts anyway).
- **Reputation is clamped to `[-100, 100]`** at apply time; `adjust_reputation` deltas saturate rather than overflow.
- **Credits** live in `inventory["item.credits"]` or a dedicated `world.player` field (agent's choice at T-09, documented there); the conservation test asserts total credits change only by amounts equal to applied reward/cost effects.

These bounds live in `applyEvent`, the single chokepoint, so they hold under replay.

---

## 6. The flat-data rule (protects serialization & replay)

> **`World` and every value inside it MUST be plain JSON-serializable data.** No class instances, Maps, Sets, functions, dates, or closures. ECS (Miniplex) is a **derived query layer**, not the source of truth: registries are rebuilt from / are pure wrappers over `World` data each tick. **No system mutates ECS entities directly; systems only emit events; events fold into `World`.**

This is added to `AGENTS.md` as a hard rule. It guarantees `serialize/deserialize` round-trips and keeps replay honest. The performance cost is accepted per `GOAL.md §3.7`.

---

## 7. The save & replay envelope (and why replay survives a growing world)

The most-promoted debugging affordance — `replay(log, seed)` — silently rots the moment the world grows, **unless the log records which content it was recorded against.** It must.

```ts
type ReplayEntry =
  | { tick: number; kind: "input"; input: InputEvent }
  | { tick: number; kind: "event"; event: GameEvent };

interface ReplayLog {
  schemaVersion: number;
  engineVersion: string;
  contentFingerprint: ContentFingerprint;   // <-- makes replay version-aware
  seed: string;
  entries: ReplayEntry[];
}

interface ContentFingerprint {
  packs: Record<string, string>;   // pack id -> semver
  registriesHash: string;          // hash of the resolved, loaded registries
}

interface SaveEnvelope {
  saveVersion: number;
  engineVersion: string;
  contentFingerprint: ContentFingerprint;
  world: World;                    // a SNAPSHOT (see below)
  logSinceSnapshot: ReplayEntry[]; // replay only from the snapshot, not t=0
}
```

**Rules:**
1. **Snapshot, don't replay-from-dawn.** A save is `{ world: snapshot, logSinceSnapshot }`. Loading restores the snapshot and replays only the tail. This fixes the 10-hours-of-log lag problem.
2. **Replay is content-version-relative.** `replay` compares the log's `contentFingerprint` to the currently loaded registries. On mismatch it **refuses or warns** (configurable), because a log from three pack-versions ago is not guaranteed to reproduce.
3. **Migration is versioned.** Any change to `World`, `ReplayLog`, or `ContentPack` format increments its version and ships a migration step + a migration test from the prior version (see `AGENT_GUIDES.md` "Evolving the schema").

---

## 8. The deterministic tick order (one model for everything)

`tick(world, inputs)` does exactly this, in this order, every time:
1. Collect inputs for the tick; append `input` entries to the log.
2. Run systems in their **fixed registered order** (`ARCHITECTURE.md §3`).
3. Collect emitted events **in order**; append `event` entries to the log.
4. Apply events in order via `applyEvent` (the single chokepoint; bounds in §5 enforced here).
5. Advance `tick`; persist `rngState`.

Input handling, persistence, debugging, and replay all converge on this one model. This is what T-04's permanent replay test asserts.
