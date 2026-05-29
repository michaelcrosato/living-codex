import { z } from "zod";
import { FlagId, FactionId, ItemId, QuestId, LocationId, NpcId, DialogueId } from "./ids";

/**
 * Effects (SCHEMA.md §5): the ONLY ways content can change the world. Each maps 1:1 to an
 * engine Event. Content cannot do anything the engine doesn't already implement. Bounds
 * (clamp reputation, forbid negative inventory) live in applyEvent, not here — see
 * WORLD_STATE.md §5.
 */
export const FlagEffect = z.object({
  kind: z.literal("set_flag"),
  flag: FlagId,
  to: z.union([z.boolean(), z.number(), z.string()]),
});
export type FlagEffect = z.infer<typeof FlagEffect>;

export const Effect = z.discriminatedUnion("kind", [
  FlagEffect,
  z.object({ kind: z.literal("adjust_reputation"), factionId: FactionId, delta: z.number().int() }),
  z.object({
    kind: z.literal("give_item"),
    itemId: ItemId,
    count: z.number().int().refine((n) => n !== 0, "count must be non-zero"),
  }),
  z.object({
    kind: z.literal("modify_skill"),
    skill: z.enum(["persuade", "sneak", "force", "tech"]),
    delta: z.number().int(),
  }),
  z.object({ kind: z.literal("start_quest"), questId: QuestId }),
  z.object({
    kind: z.literal("unlock_exit"),
    locationId: LocationId,
    exitIndex: z.number().int().nonnegative(),
  }),
  z.object({ kind: z.literal("set_npc_dialogue"), npcId: NpcId, dialogueId: DialogueId }),
  z.object({ kind: z.literal("show_text"), text: z.string().max(400) }),
  // bribe a faction: spend `cost` credits (only if affordable) to shift standing by `standing`.
  // Added in T-16 to demonstrate the bounded add-a-verb path (AGENT_GUIDES Recipe 1).
  z.object({
    kind: z.literal("bribe_faction"),
    factionId: FactionId,
    cost: z.number().int().positive(),
    standing: z.number().int(),
  }),
]);
export type Effect = z.infer<typeof Effect>;
