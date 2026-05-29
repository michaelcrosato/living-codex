import type { World, Entity, QuestRuntimeState, ObjectiveRuntimeState } from "../state/world";
import type { GameEvent } from "./event";
import { RngCursor, deserializeRng, serializeRng } from "../time/rng";
import { effectsToEvents } from "./effects";

/** The single chokepoint where bounds live, so they hold under replay (WORLD_STATE.md §5). */
const REPUTATION_MIN = -100;
const REPUTATION_MAX = 100;

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function requireEntity(world: World, entityId: string): Entity {
  const entity = world.entities[entityId];
  if (!entity) throw new Error(`applyEvent: unknown entity "${entityId}".`);
  return entity;
}

/**
 * `applyEvent(world, ev)` — pure, total, and exhaustive over the GameEvent union
 * (ARCHITECTURE.md §3). Returns a new World; never mutates the input. Conservation bounds
 * (no negative inventory; reputation clamped to [-100, 100]) are enforced HERE, the single
 * chokepoint, so they survive replay (WORLD_STATE.md §5).
 */
export function applyEvent(world: World, ev: GameEvent): World {
  switch (ev.type) {
    case "SetFlag":
      return { ...world, flags: { ...world.flags, [ev.flag]: ev.to } };

    case "AdjustReputation": {
      const current = world.reputation[ev.factionId] ?? 0;
      const next = clamp(current + ev.delta, REPUTATION_MIN, REPUTATION_MAX);
      return { ...world, reputation: { ...world.reputation, [ev.factionId]: next } };
    }

    case "GiveItem": {
      const current = world.inventory[ev.itemId] ?? 0;
      const next = current + ev.count;
      if (next < 0) {
        throw new Error(
          `applyEvent: GiveItem would drive "${ev.itemId}" below zero (${current} + ${ev.count}).`,
        );
      }
      return { ...world, inventory: { ...world.inventory, [ev.itemId]: next } };
    }

    case "ModifySkill": {
      const current = world.player.conditionMods[ev.skill];
      return {
        ...world,
        player: {
          ...world.player,
          conditionMods: { ...world.player.conditionMods, [ev.skill]: current + ev.delta },
        },
      };
    }

    case "ShowText":
    case "Interacted":
      // Logged intent for transcript/debugging (and the dialogue system, T-07); no world
      // mutation yet. Folding it is a no-op, so replay stays exact.
      return world;

    case "SpawnEntity":
      return { ...world, entities: { ...world.entities, [ev.entity.id]: ev.entity } };

    case "EnterLocation": {
      const player = requireEntity(world, world.player.entityId);
      const movedPlayer: Entity = {
        ...player,
        locationId: ev.locationId,
        pos: { ...ev.spawnAt },
      };
      return {
        ...world,
        locationId: ev.locationId,
        entities: { ...world.entities, [player.id]: movedPlayer },
      };
    }

    case "MoveEntity": {
      const entity = requireEntity(world, ev.entityId);
      return {
        ...world,
        entities: { ...world.entities, [entity.id]: { ...entity, pos: { ...ev.to } } },
      };
    }

    case "SetEntityHp": {
      const entity = requireEntity(world, ev.entityId);
      return {
        ...world,
        entities: { ...world.entities, [entity.id]: { ...entity, hp: ev.hp, alive: ev.alive } },
      };
    }

    case "ResolveSkillCheck": {
      // The ONE place a skill check consumes randomness. Because the fold is sequential and
      // replay re-applies this same event against the same starting rngState, the roll is
      // reproduced exactly (WORLD_STATE.md §3.2, §4 capture-don't-recompute).
      const cursor = new RngCursor(deserializeRng(world.rngState));
      const roll = cursor.int(1, 20);
      const total = roll + world.player.skills[ev.skill] + world.player.conditionMods[ev.skill];
      const success = total >= ev.dc;

      let next: World = { ...world, rngState: serializeRng(cursor.state) };

      const quest = next.quests[ev.questId];
      if (quest) {
        const prev: ObjectiveRuntimeState = quest.objectiveProgress[ev.objectiveKey] ?? {
          done: false,
          failed: false,
          attempts: 0,
        };
        const updated: ObjectiveRuntimeState = {
          done: success,
          failed: !success,
          attempts: prev.attempts + 1,
        };
        next = {
          ...next,
          quests: {
            ...next.quests,
            [ev.questId]: {
              ...quest,
              objectiveProgress: { ...quest.objectiveProgress, [ev.objectiveKey]: updated },
            },
          },
        };
      }

      if (!success) {
        for (const effectEvent of effectsToEvents(ev.onFail)) next = applyEvent(next, effectEvent);
      }
      return next;
    }

    case "StartQuest":
    case "OfferQuest": {
      const existing = world.quests[ev.questId];
      // Offering/starting is idempotent: don't clobber a quest already in progress.
      if (existing && existing.status !== "unoffered") return world;
      const fresh: QuestRuntimeState = {
        status: ev.type === "StartQuest" ? "active" : "offered",
        activeBranchIds: [],
        objectiveProgress: {},
        appliedEffectIds: [],
      };
      return { ...world, quests: { ...world.quests, [ev.questId]: fresh } };
    }

    default: {
      const exhaustive: never = ev;
      throw new Error(`applyEvent: unhandled event ${JSON.stringify(exhaustive)}`);
    }
  }
}

/** Fold a sequence of events left-to-right (used by the tick loop and by replay). */
export function applyEvents(world: World, events: readonly GameEvent[]): World {
  let next = world;
  for (const ev of events) next = applyEvent(next, ev);
  return next;
}
