import { z } from "zod";
import type { Registries } from "@codex/content-loader";
import { Quest, ContentPack } from "@codex/content-schema";
import type { ModelProvider } from "../llm/adapter";
import { generateStructured } from "../llm/adapter";
import { ArcSkeleton, ReferenceSet, DramatistOutput, Scorecard } from "../schemas/proposals";
import { buildCanonIndex, renderCanon, type CanonIndex } from "../canon";
import { ROLE_SYSTEM_PROMPTS, buildUserPrompt, type Role } from "../prompts";
import type { Brief } from "../brief";
import { synthesize } from "../synthesis";

/**
 * The cycle (CONTENT_PIPELINE.md §2, §4): the full agentic decomposition. Each arrow is a
 * schema-constrained, validated, self-repairing call; a distinct [TASK:*] marker lets a stub
 * route deterministically (the same role does multiple tasks). Synthesis assembles a candidate
 * ContentPack; the result is a reviewable curation bundle (proposals + scorecard + flagged).
 */
export interface CurationBundle {
  brief: Brief;
  canon: CanonIndex;
  proposals: {
    arc: ArcSkeleton;
    references: ReferenceSet;
    npcs: DramatistOutput;
    quest: z.infer<typeof Quest>;
  };
  scorecard: Scorecard;
  candidate: z.infer<typeof ContentPack>;
  flagged: string[];
}

export interface RunCycleArgs {
  brief: Brief;
  provider: ModelProvider;
  registries: Registries;
  packIds?: readonly string[];
  packId?: string;
  models?: readonly string[];
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "candidate"
  );
}

async function callRole<S extends z.ZodTypeAny>(
  provider: ModelProvider,
  role: Role,
  task: string,
  schema: S,
  user: string,
): Promise<z.output<S>> {
  return generateStructured(provider, schema, {
    system: `${ROLE_SYSTEM_PROMPTS[role]}\n[TASK:${task}]`,
    user,
  });
}

export async function runCycle(args: RunCycleArgs): Promise<CurationBundle> {
  const canon = buildCanonIndex(args.registries, args.packIds ?? []);
  const base = buildUserPrompt(args.brief, renderCanon(canon));

  const arc = await callRole(args.provider, "architect", "ARC", ArcSkeleton, base);
  const references = await callRole(args.provider, "loremaster", "REFERENCES", ReferenceSet, base);
  const dramatist = await callRole(
    args.provider,
    "dramatist",
    "NPCS",
    DramatistOutput,
    `${base}\n\n# Arc\n${JSON.stringify(arc)}`,
  );
  const quest = await callRole(
    args.provider,
    "architect",
    "QUEST",
    Quest,
    `${base}\n\n# Arc\n${JSON.stringify(arc)}\n# New NPC ids\n${JSON.stringify(dramatist.npcs.map((n) => n.id))}`,
  );
  const scorecard = await callRole(
    args.provider,
    "critic",
    "SCORECARD",
    Scorecard,
    `${base}\n\n# Proposal\n${JSON.stringify({ arc, quest })}`,
  );

  const candidate = synthesize({
    packId: args.packId ?? `pack.${slug(args.brief.intent)}`,
    title: arc.title,
    brief: args.brief,
    arc,
    references,
    dramatist,
    quest,
    models: args.models ?? [args.provider.name],
    dependsOn: args.packIds ?? [],
  });

  return {
    brief: args.brief,
    canon,
    proposals: { arc, references, npcs: dramatist, quest },
    scorecard,
    candidate,
    flagged: [...scorecard.contradictions],
  };
}
