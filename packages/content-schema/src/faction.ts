import { z } from "zod";
import { FactionId } from "./ids";

/** Faction definitions (SCHEMA.md §6). Player standing is runtime state in World, not here. */
export const Faction = z.object({
  id: FactionId,
  name: z.string().max(60),
  ethos: z.string().max(400),
  rivals: z.array(FactionId).default([]),
  allies: z.array(FactionId).default([]),
});
export type Faction = z.infer<typeof Faction>;
