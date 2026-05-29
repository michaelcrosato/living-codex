import { z } from "zod";
import { ItemId } from "./ids";

/** Item templates (SCHEMA.md §6). Static definitions; counts live in World.inventory. */
export const ItemTemplate = z.object({
  id: ItemId,
  name: z.string().max(60),
  description: z.string().max(280),
  kind: z.enum(["key", "weapon", "consumable", "quest", "trade"]),
  value: z.number().int().nonnegative().default(0),
});
export type ItemTemplate = z.infer<typeof ItemTemplate>;
