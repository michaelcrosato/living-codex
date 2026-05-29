import type { Registries } from "@codex/content-loader";
import type { ContentFingerprint, LocationId } from "@codex/content-schema";
import {
  applyEvent,
  combatSystem,
  createLog,
  createWorld,
  dialogueSystem,
  interactionSystem,
  movementSystem,
  questSystem,
  reactionsSystem,
  tick,
  type CreateWorldOptions,
  type Entity,
  type GameEvent,
  type InputEvent,
  type Narrative,
  type ReplayLog,
  type System,
  type World,
} from "@codex/engine-core";

export interface GameSessionOptions extends CreateWorldOptions {
  /** Optional events applied (and logged) at construction — e.g. initial story flags. */
  seedEvents?: readonly GameEvent[];
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
    this.world = createWorld(options);
    this.log = createLog(options.seed, fingerprint);
    if (options.seedEvents) this.applyAndLog(options.seedEvents);
    this.spawnNpcsAt(options.startLocationId);
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
    for (const spawn of location.npcSpawns) {
      const entityId = `entity.${spawn.npcId}`;
      if (this.world.entities[entityId]) continue;
      const npc = this.registries.npcs.get(spawn.npcId);
      const entity: Entity = {
        id: entityId,
        defId: spawn.npcId,
        locationId,
        pos: { ...spawn.at },
        alive: true,
        ...(npc?.combat ? { hp: npc.combat.hp } : {}),
      };
      events.push({ type: "SpawnEntity", entity });
    }
    this.applyAndLog(events);
  }

  step(inputs: readonly InputEvent[], dt = 1 / 60): void {
    const ctx = { locations: this.registries.locations, npcs: this.registries.npcs };
    const systems: System[] = [
      movementSystem(inputs),
      interactionSystem(inputs, ctx),
      combatSystem(inputs),
      reactionsSystem(this.registries.npcs),
      questSystem(this.registries.quests, inputs),
      dialogueSystem(inputs, { narrative: this.narrative, dialogues: this.registries.dialogues }),
    ];
    const result = tick(this.world, inputs, systems, dt);
    this.log.entries.push(...result.entries);
    this.world = result.world;
    this.spawnNpcsAt(this.world.locationId);
  }
}
