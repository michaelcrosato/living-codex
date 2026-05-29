import { z } from "zod";

/**
 * Branded IDs (SCHEMA.md §1). The prefix is enforced at RUNTIME because content loads
 * from JSON — without the regex an NpcId and a QuestId could parse the same string. The
 * `.brand<B>()` makes them non-interchangeable at compile time too.
 */
// Note: the first segment allows underscores (`[a-z0-9_]+`), unlike the literal regex in
// SCHEMA.md §1. The spec's own canonical ids — quest.the_warehouse, flag.met_varga,
// faction.varga_crew — all use underscores in the first segment, and the §9/§11 examples are
// asserted to validate. The pack-id regex (§8) already permits underscores; this aligns the
// brand with that intent so the documented content actually parses.
const brand = <B extends string>(prefix: B) =>
  z
    .string()
    .regex(
      new RegExp(`^${prefix}\\.[a-z0-9_]+(\\.[a-z0-9_]+)*$`),
      `expected id like "${prefix}.example"`,
    )
    .brand<B>();

export const NpcId = brand("npc");
export const QuestId = brand("quest");
export const LocationId = brand("location");
export const FactionId = brand("faction");
export const ItemId = brand("item");
export const DialogueId = brand("dialogue");
export const FlagId = brand("flag");

export type NpcId = z.infer<typeof NpcId>;
export type QuestId = z.infer<typeof QuestId>;
export type LocationId = z.infer<typeof LocationId>;
export type FactionId = z.infer<typeof FactionId>;
export type ItemId = z.infer<typeof ItemId>;
export type DialogueId = z.infer<typeof DialogueId>;
export type FlagId = z.infer<typeof FlagId>;
