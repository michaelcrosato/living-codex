import { z } from "zod";

/**
 * Intermediate sub-task outputs (CONTENT_PIPELINE.md §4). These are NOT shipped content — they
 * are the structured hand-offs between roles. P1 uses ArcSkeleton (Architect) and Scorecard
 * (Critic); P2 adds ReferenceSet, generated Npc/Quest, and ContentPack synthesis.
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
