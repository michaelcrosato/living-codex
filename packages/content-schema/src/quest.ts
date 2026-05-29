import { z } from "zod";
import { QuestId, NpcId, LocationId, ItemId, FlagId, FactionId } from "./ids";
import { Condition } from "./condition";
import { Effect } from "./effect";

/**
 * Quests (SCHEMA.md §4). Multiple solutions are expressed as branches — agency is a data
 * property, not a script. Failure is first-class: skill_check.onFail can foreclose a branch,
 * raise suspicion, or fall through to another branch (WORLD_STATE.md §2–§3).
 */
export const Objective = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("talk_to"), npcId: NpcId }),
  z.object({ kind: z.literal("reach"), locationId: LocationId }),
  z.object({ kind: z.literal("retrieve"), itemId: ItemId, count: z.number().int().positive() }),
  z.object({
    kind: z.literal("skill_check"),
    skill: z.enum(["persuade", "sneak", "force", "tech"]),
    dc: z.number().int().min(1).max(20),
    retryable: z.boolean().default(false),
    onFail: z.array(Effect).default([]),
  }),
  z.object({ kind: z.literal("defeat"), npcId: NpcId }),
  z.object({
    kind: z.literal("set_flag"),
    flag: FlagId,
    to: z.union([z.boolean(), z.number(), z.string()]),
  }),
]);
export type Objective = z.infer<typeof Objective>;

export const Branch = z.object({
  id: z.string().max(40),
  label: z.string().max(80),
  objectives: z.array(Objective).min(1).max(6),
  onComplete: z.array(Effect).default([]),
  onFail: z.array(Effect).default([]),
});
export type Branch = z.infer<typeof Branch>;

export const Quest = z.object({
  id: QuestId,
  title: z.string().max(80),
  giverNpcId: NpcId.optional(),
  summary: z.string().max(400),
  offerWhen: z.array(Condition).default([]),
  branches: z.array(Branch).min(1).max(5),
  onAnyComplete: z.array(Effect).default([]),
  rewards: z.object({
    credits: z.number().int().nonnegative().default(0),
    items: z
      .array(z.object({ itemId: ItemId, count: z.number().int().positive() }))
      .default([]),
    reputation: z
      .array(z.object({ factionId: FactionId, delta: z.number().int() }))
      .default([]),
  }),
});
export type Quest = z.infer<typeof Quest>;
