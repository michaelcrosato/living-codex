import type { Registries } from "@codex/content-loader";
import type { ContentFingerprint, LocationId } from "@codex/content-schema";
import {
  applyEvent,
  bribeSystem,
  combatSystem,
  createLog,
  createWorld,
  dialogueSystem,
  interactionSystem,
  loadSave,
  movementSystem,
  questSystem,
  reactionsSystem,
  storyletSystem,
  tick,
  type CreateWorldOptions,
  type Entity,
  type GameEvent,
  type InputEvent,
  type Narrative,
  type ReplayLog,
  type SaveEnvelope,
  type System,
  type World,
} from "@codex/engine-core";

export interface GameSessionOptions extends CreateWorldOptions {
  /** Optional events applied (and logged) at construction — e.g. initial story flags. */
  seedEvents?: readonly GameEvent[];
  /**
   * Restore from a loaded save (SPEC-78): when present, the session starts from this already-reconstructed
   * World (e.g. `loadSave(envelope)`) instead of a fresh `createWorld` — no seed events, no re-spawn (the
   * restored World already carries its entities). Use `GameSession.restore()` to build one from a save.
   */
  restoreWorld?: World;
}

/**
 * The headless heart of the playable app: holds the World + ReplayLog + registries and steps
 * the real tick loop (movement, interaction, combat, quests, dialogue). NPC entities are
 * spawned from each location's `npcSpawns` on entry — as logged SpawnEntity events, so the
 * whole session replays exactly. The browser shell (main.ts) drives `step()` from rAF; tests
 * drive it directly, which is why this object is DOM-free and unit-testable.
 */
export class GameSession {
  world: World;
  readonly log: ReplayLog;
  private readonly spawnedLocations = new Set<string>();

  constructor(
    private readonly registries: Registries,
    fingerprint: ContentFingerprint,
    private readonly narrative: Narrative,
    options: GameSessionOptions,
  ) {
    this.log = createLog(options.seed, fingerprint);
    if (options.restoreWorld) {
      // Restored save: the World already has its entities + current location. Don't re-create or re-spawn;
      // mark the current location spawned so re-entry doesn't redundantly scan it (spawnNpc guards dupes anyway).
      this.world = options.restoreWorld;
      this.spawnedLocations.add(this.world.locationId);
    } else {
      this.world = createWorld(options);
      if (options.seedEvents) this.applyAndLog(options.seedEvents);
      this.spawnNpcsAt(options.startLocationId);
    }
  }

  /**
   * Build a session from a loaded save (SPEC-78): reconstructs the World via `loadSave` and starts from it.
   * The session's seed/startLocationId derive from the restored World, so the loaded game continues exactly.
   */
  static restore(
    registries: Registries,
    fingerprint: ContentFingerprint,
    narrative: Narrative,
    save: SaveEnvelope,
  ): GameSession {
    const world = loadSave(save);
    return new GameSession(registries, fingerprint, narrative, {
      seed: world.seed,
      startLocationId: world.locationId,
      restoreWorld: world,
    });
  }

  private applyAndLog(events: readonly GameEvent[]): void {
    for (const event of events) {
      this.log.entries.push({ tick: this.world.tick, kind: "event", event });
      this.world = applyEvent(this.world, event);
    }
  }

  private spawnNpcsAt(locationId: LocationId): void {
    if (this.spawnedLocations.has(locationId)) return;
    this.spawnedLocations.add(locationId);
    const location = this.registries.locations.get(locationId);
    if (!location) return;
    const events: GameEvent[] = [];
    const spawnNpc = (npcId: string, at: { x: number; y: number }): void => {
      const entityId = `entity.${npcId}`;
      if (this.world.entities[entityId]) return;
      const npc = this.registries.npcs.get(npcId as never);
      const entity: Entity = {
        id: entityId,
        defId: npcId,
        locationId,
        pos: { ...at },
        alive: true,
        ...(npc?.combat ? { hp: npc.combat.hp } : {}),
      };
      events.push({ type: "SpawnEntity", entity });
    };
    // explicit placements from the location...
    for (const spawn of location.npcSpawns) spawnNpc(spawn.npcId, spawn.at);
    // ...plus any NPC (from any pack) that calls this location home, scattered deterministically.
    let i = 0;
    for (const npc of this.registries.npcs.values()) {
      if (npc.homeLocationId !== locationId) continue;
      const at = { x: 40 + ((i * 53) % 320), y: 40 + ((i * 37) % 200) };
      spawnNpc(npc.id, at);
      i++;
    }
    this.applyAndLog(events);
  }

  /** Advance one fixed step; returns the events emitted this tick (so the shell can react). */
  step(inputs: readonly InputEvent[], dt = 1 / 60): GameEvent[] {
    const ctx = { locations: this.registries.locations, npcs: this.registries.npcs };
    const systems: System[] = [
      movementSystem(inputs),
      interactionSystem(inputs, ctx),
      combatSystem(inputs),
      bribeSystem(inputs),
      reactionsSystem(this.registries.npcs),
      questSystem(this.registries.quests, inputs, this.registries.npcs),
      dialogueSystem(inputs, { narrative: this.narrative, dialogues: this.registries.dialogues }),
      storyletSystem(this.registries.storylets),
    ];
    const result = tick(this.world, inputs, systems, dt);
    this.log.entries.push(...result.entries);
    this.world = result.world;
    this.spawnNpcsAt(this.world.locationId);
    return result.events;
  }
}
