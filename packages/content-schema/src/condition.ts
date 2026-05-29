import { z } from "zod";
import { FlagId, FactionId, ItemId, QuestId } from "./ids";

/**
 * Conditions (SCHEMA.md §7): a tiny, safe, typed expression language that gates quests,
 * exits, and NPC reactions. NO eval. The engine's conditions/conditions.ts evaluates this
 * tree against `World`, pure and exhaustive over the union.
 */
export type Condition =
  | { kind: "flag_is"; flag: FlagId; equals: boolean | number | string }
  | { kind: "reputation_at_least"; factionId: FactionId; value: number }
  | { kind: "has_item"; itemId: ItemId; count: number }
  | { kind: "quest_completed"; questId: QuestId }
  | { kind: "credits_at_least"; amount: number }
  | { kind: "not"; of: Condition }
  | { kind: "all"; of: Condition[] }
  | { kind: "any"; of: Condition[] };

// Input is `unknown` (content arrives as JSON, ids are plain strings pre-parse); output is
// the branded `Condition`. The relaxed input param is what makes the recursive brand typecheck.
export const Condition: z.ZodType<Condition, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("flag_is"),
      flag: FlagId,
      equals: z.union([z.boolean(), z.number(), z.string()]),
    }),
    z.object({
      kind: z.literal("reputation_at_least"),
      factionId: FactionId,
      value: z.number().int(),
    }),
    z.object({ kind: z.literal("has_item"), itemId: ItemId, count: z.number().int().positive().default(1) }),
    z.object({ kind: z.literal("quest_completed"), questId: QuestId }),
    z.object({ kind: z.literal("credits_at_least"), amount: z.number().int().nonnegative() }),
    z.object({ kind: z.literal("not"), of: Condition }),
    z.object({ kind: z.literal("all"), of: z.array(Condition).min(1) }),
    z.object({ kind: z.literal("any"), of: z.array(Condition).min(1) }),
  ]),
);
