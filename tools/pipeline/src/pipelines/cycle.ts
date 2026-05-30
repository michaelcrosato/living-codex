import { z } from "zod";
import {
  auditCanon,
  buildCanonGraph,
  relevantSubgraph,
  renderAssertionRecord,
  type Registries,
} from "@codex/content-loader";
import { Quest, ContentPack, type Storylet } from "@codex/content-schema";
import type { ModelProvider } from "../llm/adapter";
import { generateStructured } from "../llm/adapter";
import {
  ArcSkeleton,
  ReferenceSet,
  DramatistOutput,
  Scorecard,
  StoryletProposals,
} from "../schemas/proposals";
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
    quest?: z.infer<typeof Quest>;
    storylets?: z.infer<typeof Storylet>[];
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
  // Existing canon packs, so the candidate is audited against them (CONTENT_PIPELINE.md §6).
  // Omit to audit the candidate's internal consistency only.
  priorPacks?: readonly z.infer<typeof ContentPack>[];
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

  // 1. Build the canon assertion graph from prior packs (or compile from registries if priorPacks is not provided)
  const priorPacks = args.priorPacks && args.priorPacks.length > 0
    ? args.priorPacks
    : [
        {
          id: "prior_packs_compiled",
          version: "0",
          title: "Compiled Prior Packs",
          dependsOn: [],
          provenance: { authoredBy: "human" as const, models: [] },
          npcs: [...args.registries.npcs.values()],
          factions: [...args.registries.factions.values()],
          locations: [...args.registries.locations.values()],
          items: [...args.registries.items.values()],
          quests: [...args.registries.quests.values()],
          assertions: [],
          dialogues: [],
          storylets: [],
        } as ContentPack
      ];
  const graph = buildCanonGraph(priorPacks);

  // 2. Query relevant subgraph for brief's seed IDs
  const sub = relevantSubgraph(graph, args.brief.ground_in);

  // 3. Serialize it deterministically
  const groundingText = sub.records.length > 0
    ? sub.records.map(renderAssertionRecord).join("\n")
    : undefined;

  const base = buildUserPrompt(args.brief, renderCanon(canon), groundingText);

  const arc = await callRole(args.provider, "architect", "ARC", ArcSkeleton, base);
  const references = await callRole(args.provider, "loremaster", "REFERENCES", ReferenceSet, base);
  const dramatist = await callRole(
    args.provider,
    "dramatist",
    "NPCS",
    DramatistOutput,
    `${base}\n\n# Arc\n${JSON.stringify(arc)}`,
  );
  // The quest arrow is budget-driven: a patron-only brief (budget.quests = 0) skips it.
  const quest =
    args.brief.budget.quests > 0
      ? await callRole(
          args.provider,
          "architect",
          "QUEST",
          Quest,
          `${base}\n\n# Arc\n${JSON.stringify(arc)}\n# New NPC ids\n${JSON.stringify(dramatist.npcs.map((n) => n.id))}`,
        )
      : undefined;
  // Storylet arrow (SPEC-26): budget-driven, like the quest arrow. Reactive/ambient flavor only —
  // a [TASK:STORYLETS] marker routes the stub deterministically (the same Dramatist role, new task).
  const storylets =
    args.brief.budget.storylets > 0
      ? (
          await callRole(
            args.provider,
            "dramatist",
            "STORYLETS",
            StoryletProposals,
            `${base}\n\n# Arc\n${JSON.stringify(arc)}\n\n# Storylet task\n` +
              `Propose up to ${args.brief.budget.storylets} REACTIVE/AMBIENT storylet(s): short barks/flavor ` +
              `gated on world state (flags, reputation, skill_at_least, quest_completed). NEVER gate a main-plot ` +
              `beat on salience. Make each fire-once: include an effect that sets a flag a precondition excludes.`,
          )
        ).storylets
      : [];
  const scorecard = await callRole(
    args.provider,
    "critic",
    "SCORECARD",
    Scorecard,
    `${base}\n\n# Proposal\n${JSON.stringify(storylets.length ? { arc, quest, storylets } : { arc, quest })}`,
  );

  const candidate = synthesize({
    packId: args.packId ?? `pack.${slug(args.brief.intent)}`,
    title: arc.title,
    brief: args.brief,
    arc,
    references,
    dramatist,
    models: args.models ?? [args.provider.name],
    dependsOn: args.packIds ?? [],
    ...(quest ? { quest } : {}),
    ...(storylets.length ? { storylets } : {}),
  });

  // Query the canon assertion graph for semantic contradictions (the candidate against existing
  // canon) and surface them next to the Critic's prose flags for the human (CONTENT_PIPELINE §6).
  const canonContradictions = auditCanon(
    [...(args.priorPacks ?? []), candidate],
    args.registries,
  ).map((c) => `[canon:${c.rule}] ${c.message}`);

  // Advisory threshold flagging: items below 3/5 are flagged "needs attention" for the human.
  const rubricFlags: string[] = [];
  const threshold = 3;
  if (scorecard.canonConsistency < threshold) {
    rubricFlags.push(`[rubric] canonConsistency needs attention (${scorecard.canonConsistency}/5): ${scorecard.canonConsistencyRationale}`);
  }
  if (scorecard.choiceDensity < threshold) {
    rubricFlags.push(`[rubric] choiceDensity needs attention (${scorecard.choiceDensity}/5): ${scorecard.choiceDensityRationale}`);
  }
  if (scorecard.emotionalStakes < threshold) {
    rubricFlags.push(`[rubric] emotionalStakes needs attention (${scorecard.emotionalStakes}/5): ${scorecard.emotionalStakesRationale}`);
  }
  if (scorecard.novelty < threshold) {
    rubricFlags.push(`[rubric] novelty needs attention (${scorecard.novelty}/5): ${scorecard.noveltyRationale}`);
  }
  if (scorecard.integrationCost < threshold) {
    rubricFlags.push(`[rubric] integrationCost needs attention (${scorecard.integrationCost}/5): ${scorecard.integrationCostRationale}`);
  }

  return {
    brief: args.brief,
    canon,
    proposals: {
      arc,
      references,
      npcs: dramatist,
      ...(quest ? { quest } : {}),
      ...(storylets.length ? { storylets } : {}),
    },
    scorecard,
    candidate,
    flagged: [...scorecard.contradictions, ...canonContradictions, ...rubricFlags],
  };
}
