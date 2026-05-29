import { z } from "zod";
import { Npc, NpcId, FactionId, LocationId, ItemId } from "@codex/content-schema";

/**
 * Intermediate sub-task outputs (CONTENT_PIPELINE.md §4). NOT shipped content — the structured
 * hand-offs between roles. Each is validated immediately; synthesis assembles them into a
 * candidate ContentPack. Where possible they REUSE the treaty (e.g. GeneratedNpc derives from
 * the real Npc schema), so a proposal is wrong the same way shipped content would be wrong.
 */
export const ArcSkeleton = z.object({
  title: z.string().max(80),
  premise: z.string().max(400),
  beats: z.array(z.string().max(200)).min(1).max(8),
  branches: z
    .array(
      z.object({
        label: z.string().max(80),
        approach: z.enum(["talk", "sneak", "force", "tech", "other"]),
        stakes: z.string().max(200),
      }),
    )
    .min(1)
    .max(5),
});
export type ArcSkeleton = z.infer<typeof ArcSkeleton>;

/** Loremaster: which EXISTING canon entities to ground in (existence is proven at bake, P3). */
export const ReferenceSet = z.object({
  npcs: z.array(NpcId).default([]),
  factions: z.array(FactionId).default([]),
  locations: z.array(LocationId).default([]),
  items: z.array(ItemId).default([]),
});
export type ReferenceSet = z.infer<typeof ReferenceSet>;

/** Dramatist: a proposed NPC = the real Npc minus its dialogue wiring, plus raw Ink source. */
export const GeneratedNpc = Npc.omit({ dialogueId: true, reactsTo: true }).extend({
  ink: z.string().min(1),
  declaredVars: z.array(z.string()).default([]),
});
export type GeneratedNpc = z.infer<typeof GeneratedNpc>;

export const DramatistOutput = z.object({ npcs: z.array(GeneratedNpc).min(1).max(12) });
export type DramatistOutput = z.infer<typeof DramatistOutput>;

export const Scorecard = z.object({
  canonConsistency: z.number().int().min(0).max(10),
  choiceDensity: z.number().int().min(0).max(10),
  emotionalStakes: z.number().int().min(0).max(10),
  novelty: z.number().int().min(0).max(10),
  integrationCost: z.number().int().min(0).max(10),
  contradictions: z.array(z.string()),
  notes: z.string().max(600),
});
export type Scorecard = z.infer<typeof Scorecard>;
