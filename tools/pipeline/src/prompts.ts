import type { Brief } from "./brief";

/**
 * Role system-prompts (CONTENT_PIPELINE.md §3). Each starts with an UPPERCASE role marker so a
 * StubProvider can route deterministically by role. The brief, schema, and canon are identical
 * across roles; only the instruction differs. Swap models freely — the prompt is the role.
 */
export const ROLE_SYSTEM_PROMPTS = {
  architect:
    "ARCHITECT. You plot the arc: beats, branches, stakes, and where player agency lives. " +
    "Every quest must offer at least three viable solutions expressed as branches. Output JSON only.",
  dramatist:
    "DRAMATIST. You write prose, character voice, dialogue, and subtext. Human-sounding, terse, " +
    "noir. Stay in canon. Output JSON only.",
  loremaster:
    "LOREMASTER. You ground everything in the provided canon index. Reuse existing IDs; never " +
    "invent an ID that already exists. Flag anything that contradicts canon. Output JSON only.",
  wildcard:
    "WILDCARD. You inject one surprising but on-theme idea the others would miss. Output JSON only.",
  critic:
    "CRITIC. You evaluate proposals as a role-neutral judge using a strict, fixed rubric. " +
    "For each criterion, write your short rationale before assigning an integer score from 1 to 5. " +
    "Locked criteria: canon-consistency, choice-density, emotional-stakes, novelty, integration-cost. " +
    "Be specific about canon contradictions. Output JSON only.",
} as const;

export type Role = keyof typeof ROLE_SYSTEM_PROMPTS;

export function buildUserPrompt(brief: Brief, canonText: string, groundingText?: string): string {
  return [
    "# Brief",
    `intent: ${brief.intent}`,
    brief.constraints.length
      ? `constraints:\n${brief.constraints.map((c) => `  - ${c}`).join("\n")}`
      : "",
    brief.ground_in.length ? `ground_in: ${brief.ground_in.join(", ")}` : "",
    `budget: npcs=${brief.budget.npcs} quests=${brief.budget.quests} locations=${brief.budget.locations}`,
    brief.tone ? `tone: ${brief.tone}` : "",
    "",
    "# Established canon (do not reinvent these IDs)",
    canonText,
    "",
    groundingText
      ? [
          "# Grounding facts (assertions from related entities)",
          groundingText,
          "",
        ].join("\n")
      : "",
    "Return JSON that satisfies the provided schema. No prose, no code fences.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** A copy-pasteable example brief (CONTENT_PIPELINE.md §5). */
export const EXAMPLE_BRIEF = `intent: "Introduce a rival fixer who competes with Varga for the player's loyalty."
constraints:
  - "Must fit the Ashfall district established in pack.opening."
  - "Player must be able to side with either fixer or play them against each other."
  - "At least 3 viable solutions to the introductory quest."
ground_in:
  - faction.varga_crew
  - faction.ashfall_syndicate
  - location.ashfall_district
budget:
  npcs: 3
  quests: 1
  locations: 1
tone: "noir, terse, morally grey"
`;
