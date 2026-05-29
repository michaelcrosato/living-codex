import type { LocationId, FactionId, ItemId, FlagId, QuestId } from "@codex/content-schema";
import { seedRng, serializeRng } from "../time/rng";

/**
 * The runtime state contract (WORLD_STATE.md §1). `World` is the ONLY authoritative state
 * and is plain, JSON-serializable data — no class instances, Maps, Sets, functions, dates,
 * or closures (the flat-data rule, §6). Everything else (ECS queries, render intents) is
 * derived from it.
 */

/** A runtime entity-instance id (distinct from a static NpcId definition). */
export type EntityId = string;
export type SkillId = "persuade" | "sneak" | "force" | "tech";

export const WORLD_VERSION = 1;
export const SKILLS: readonly SkillId[] = ["persuade", "sneak", "force", "tech"];

export interface CharacterState {
  entityId: EntityId;
  skills: Record<SkillId, number>;
  /** Temporary situational modifiers from world state (WORLD_STATE.md §3). */
  conditionMods: Record<SkillId, number>;
}

/** Dynamic per-instance state of something in the world; static definition lives in a Registry. */
export interface Entity {
  id: EntityId;
  defId: string;
  locationId: LocationId;
  pos: { x: number; y: number };
  hp?: number;
  alive: boolean;
}

/** inkjs StorySession.save() output, captured into the event log (WORLD_STATE.md §4). */
export type SerializedDialogueState = string;

export interface ObjectiveRuntimeState {
  done: boolean;
  failed: boolean;
  attempts: number;
}

export interface QuestRuntimeState {
  status: "unoffered" | "offered" | "active" | "completed" | "failed";
  activeBranchIds: string[];
  completedBranchId?: string;
  objectiveProgress: Record<string, ObjectiveRuntimeState>;
  appliedEffectIds: string[];
}

export interface World {
  version: number;
  seed: string;
  rngState: string;
  tick: number;
  player: CharacterState;
  locationId: LocationId;
  entities: Record<EntityId, Entity>;
  flags: Record<FlagId, boolean | number | string>;
  inventory: Record<ItemId, number>;
  reputation: Record<FactionId, number>;
  quests: Record<QuestId, QuestRuntimeState>;
  dialogue: Record<string, SerializedDialogueState>;
}

export interface CreateWorldOptions {
  seed: string;
  startLocationId: LocationId;
  playerEntityId?: EntityId;
  skills?: Partial<Record<SkillId, number>>;
  startPos?: { x: number; y: number };
}

function zeroedSkills(): Record<SkillId, number> {
  return { persuade: 0, sneak: 0, force: 0, tech: 0 };
}

/** Construct a fresh, deterministic initial world (the t=0 snapshot for a session). */
export function createWorld(opts: CreateWorldOptions): World {
  const playerEntityId = opts.playerEntityId ?? "entity.player";
  const pos = opts.startPos ?? { x: 0, y: 0 };
  return {
    version: WORLD_VERSION,
    seed: opts.seed,
    rngState: serializeRng(seedRng(opts.seed)),
    tick: 0,
    player: {
      entityId: playerEntityId,
      skills: { ...zeroedSkills(), ...opts.skills },
      conditionMods: zeroedSkills(),
    },
    locationId: opts.startLocationId,
    entities: {
      [playerEntityId]: {
        id: playerEntityId,
        defId: "player",
        locationId: opts.startLocationId,
        pos: { ...pos },
        alive: true,
      },
    },
    flags: {},
    inventory: {},
    reputation: {},
    quests: {},
    dialogue: {},
  };
}
