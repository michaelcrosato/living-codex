import { z } from "zod";
import { DialogueId } from "./ids";
import { Location } from "./location";
import { Npc } from "./npc";
import { Quest } from "./quest";
import { Faction } from "./faction";
import { ItemTemplate } from "./item";
import { CanonAssertion } from "./assertion";

/** Content ships in packs (SCHEMA.md §8): a manifest + arrays of entities + provenance. */
export const Provenance = z.object({
  authoredBy: z.enum(["human", "pipeline"]),
  models: z.array(z.string()).default([]),
  promptHash: z.string().optional(),
  curatedBy: z.string().optional(),
  approvedAt: z.string().datetime().optional(),
});
export type Provenance = z.infer<typeof Provenance>;

/**
 * Dialogue is FIRST-CLASS content — without it, referential integrity cannot validate the
 * DialogueId references that NPCs and effects point at. `compiled` is inkjs JSON whose shape
 * is owned by the narrative-ink adapter.
 */
export const DialogueAsset = z.object({
  id: DialogueId,
  format: z.literal("ink-json"),
  inkVersion: z.string(),
  sourceHash: z.string(),
  compiled: z.unknown(),
  declaredVars: z.array(z.string()).default([]),
});
export type DialogueAsset = z.infer<typeof DialogueAsset>;

export const ContentPack = z.object({
  id: z.string().regex(/^pack\.[a-z0-9_]+$/),
  version: z.string(),
  title: z.string().max(80),
  dependsOn: z.array(z.string()).default([]),
  provenance: Provenance,
  locations: z.array(Location).default([]),
  npcs: z.array(Npc).default([]),
  quests: z.array(Quest).default([]),
  factions: z.array(Faction).default([]),
  items: z.array(ItemTemplate).default([]),
  dialogues: z.array(DialogueAsset).default([]),
  // Structured canon facts queried by the offline canon audit (CONTENT_PIPELINE.md §6).
  // Additive + engine-ignored: the simulation never reads these.
  assertions: z.array(CanonAssertion).default([]),
});
export type ContentPack = z.infer<typeof ContentPack>;
