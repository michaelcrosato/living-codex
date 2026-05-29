import type { LocationId, FactionId, ItemId, FlagId, QuestId, DialogueId, Effect } from "@codex/content-schema";
import type { Entity, EntityId, SkillId } from "../state/world";

/**
 * The engine's vocabulary (ARCHITECTURE.md §3). Events are the ONLY way the world changes;
 * `applyEvent` folds them. The state-mutating effect kinds in SCHEMA.md §5 map 1:1 onto a
 * subset of these (SetFlag, AdjustReputation, GiveItem, ModifySkill, StartQuest, …).
 */
export type GameEvent =
  // --- effect-mirroring events (content's vocabulary, SCHEMA.md §5) ---
  | { type: "SetFlag"; flag: FlagId; to: boolean | number | string }
  | { type: "AdjustReputation"; factionId: FactionId; delta: number }
  | { type: "GiveItem"; itemId: ItemId; count: number }
  | { type: "ModifySkill"; skill: SkillId; delta: number }
  | { type: "StartQuest"; questId: QuestId }
  | { type: "ShowText"; text: string }
  // --- core engine events ---
  | { type: "SpawnEntity"; entity: Entity }
  | { type: "EnterLocation"; locationId: LocationId; spawnAt: { x: number; y: number } }
  | { type: "MoveEntity"; entityId: EntityId; to: { x: number; y: number } }
  | { type: "SetEntityHp"; entityId: EntityId; hp: number; alive: boolean }
  | { type: "OfferQuest"; questId: QuestId }
  // intent: the player interacted with an entity (the dialogue system, T-07, will consume it)
  | { type: "Interacted"; entityId: EntityId; dialogueId?: DialogueId }
  // resolves a skill_check objective: rolls the single RNG inside the fold, captures the
  // outcome, and applies authored onFail effects on failure (WORLD_STATE.md §3.2)
  | {
      type: "ResolveSkillCheck";
      questId: QuestId;
      objectiveKey: string;
      skill: SkillId;
      dc: number;
      onFail: Effect[];
    }
  // --- quest runtime (T-08) ---
  | { type: "ActivateQuest"; questId: QuestId; branchIds: string[] }
  | { type: "MarkObjective"; questId: QuestId; objectiveKey: string; done: boolean; failed: boolean }
  | { type: "CompleteQuestBranch"; questId: QuestId; branchId: string; appliedEffectIds: string[] }
  | { type: "ForecloseBranch"; questId: QuestId; branchId: string }
  // --- minimal combat (T-09): resolves a `defeat` objective deterministically ---
  | { type: "ResolveAttack"; attackerEntityId: EntityId; targetEntityId: EntityId }
  // bookkeeping: advances the fixed-timestep counter; logged so replay reproduces World.tick
  | { type: "AdvanceTick" }
  // dialogue advanced one choice: carries the post-choice serialized Ink state (captured, not
  // recomputed — WORLD_STATE.md §4) and the declared story-vars mirrored into World.flags
  | {
      type: "DialogueAdvanced";
      dialogueId: DialogueId;
      inkState: string;
      flags: Record<string, boolean | number | string>;
    };

export type GameEventType = GameEvent["type"];

/** Player input for a tick (WORLD_STATE.md §8). Systems (T-06+) turn these into GameEvents. */
export type InputEvent =
  | { type: "Move"; dir: { x: number; y: number } }
  | { type: "Interact" }
  | { type: "Choose"; dialogueId: DialogueId; choiceIndex: number }
  | { type: "UseExit"; exitIndex: number }
  | { type: "Attack" };
