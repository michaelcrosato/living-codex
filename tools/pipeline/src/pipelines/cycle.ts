import type { Registries } from "@codex/content-loader";
import type { ModelProvider } from "../llm/adapter";
import { generateStructured } from "../llm/adapter";
import { ArcSkeleton, Scorecard } from "../schemas/proposals";
import { buildCanonIndex, renderCanon, type CanonIndex } from "../canon";
import { ROLE_SYSTEM_PROMPTS, buildUserPrompt } from "../prompts";
import type { Brief } from "../brief";

/**
 * The cycle (CONTENT_PIPELINE.md §2). P1 is the runnable SHELL: export canon → Architect drafts
 * an arc skeleton → Critic scores it. Each call is schema-constrained and validated (with
 * auto-repair). P2 expands this into the full agentic decomposition (§4): Loremaster references,
 * Dramatist NPCs+Ink, Architect quest, synthesis into a candidate ContentPack + a curation bundle.
 */
export interface CycleResult {
  canon: CanonIndex;
  arc: ArcSkeleton;
  scorecard: Scorecard;
}

export interface RunCycleArgs {
  brief: Brief;
  provider: ModelProvider;
  registries: Registries;
  packIds?: readonly string[];
}

export async function runCycle(args: RunCycleArgs): Promise<CycleResult> {
  const canon = buildCanonIndex(args.registries, args.packIds ?? []);
  const canonText = renderCanon(canon);
  const user = buildUserPrompt(args.brief, canonText);

  const arc = await generateStructured(args.provider, ArcSkeleton, {
    system: ROLE_SYSTEM_PROMPTS.architect,
    user,
  });

  const scorecard = await generateStructured(args.provider, Scorecard, {
    system: ROLE_SYSTEM_PROMPTS.critic,
    user: `${user}\n\n# Proposed arc to critique\n${JSON.stringify(arc, null, 2)}`,
  });

  return { canon, arc, scorecard };
}
