import { StubProvider, stubByRole } from "./llm/stub";

/**
 * A canned, schema-valid ensemble response for the "rival fixer" brief — keyed by the [TASK:*]
 * marker the cycle appends to each role's system prompt. Shared by the offline `pipeline:cycle`
 * demo and the golden-master test, so the CLI's output and the test's expected hash are derived
 * from the SAME deterministic inputs.
 */
const ARC = {
  title: "The Rival Fixer",
  premise: "A smoother operator sets up across the district and starts poaching Varga's jobs.",
  beats: ["Hear about Sable", "Take a test job", "Choose a side or burn both"],
  branches: [
    {
      label: "Stay loyal to Varga",
      approach: "talk",
      stakes: "Varga's trust deepens; Sable turns hostile.",
    },
    {
      label: "Play them against each other",
      approach: "tech",
      stakes: "Both owe you — and both watch you.",
    },
    { label: "Throw in with Sable", approach: "force", stakes: "Fast credits, a burned bridge." },
  ],
};

const REFERENCES = {
  npcs: ["npc.varga"],
  factions: ["faction.varga_crew", "faction.ashfall_syndicate"],
  locations: ["location.ashfall_district"],
  items: [],
};

const NPCS = {
  npcs: [
    {
      id: "npc.rival_fixer",
      name: "Sable",
      faction: "faction.ashfall_syndicate",
      appearance: { bodyColor: "#2a2a33", accentColor: "#e0466b", silhouette: "tall" },
      bio: {
        role: "upstart fixer",
        backstory: "Came up from the flooded levels with a smile and a knife.",
        wants: "to take Varga's clients",
        fears: "being sent back down",
        voice: "smooth, fast, never quite honest",
        secrets: [],
      },
      ink: "VAR heard_sable = false\nSable leans in. \"Varga's slipping. I'm not.\"\n+ [Listen]\n~ heard_sable = true\n-> END\n+ [Walk off]\n-> END",
      declaredVars: ["heard_sable"],
    },
  ],
};

const QUEST = {
  id: "quest.rival_courtship",
  title: "Courting Sable",
  giverNpcId: "npc.rival_fixer",
  summary: "Sable wants a job that would burn Varga. Choose a side — or play both.",
  offerWhen: [{ kind: "flag_is", flag: "flag.heard_sable", equals: true }],
  branches: [
    {
      id: "loyal",
      label: "Stay loyal to Varga",
      objectives: [{ kind: "talk_to", npcId: "npc.varga" }],
      onComplete: [{ kind: "adjust_reputation", factionId: "faction.varga_crew", delta: 10 }],
    },
    {
      id: "play",
      label: "Play them against each other",
      objectives: [{ kind: "skill_check", skill: "tech", dc: 13 }],
      onComplete: [{ kind: "set_flag", flag: "flag.played_both", to: true }],
    },
    {
      id: "defect",
      label: "Throw in with Sable",
      objectives: [{ kind: "talk_to", npcId: "npc.rival_fixer" }],
      onComplete: [
        { kind: "adjust_reputation", factionId: "faction.ashfall_syndicate", delta: 10 },
      ],
    },
  ],
  onAnyComplete: [{ kind: "set_flag", flag: "flag.rival_resolved", to: true }],
  rewards: { credits: 150, items: [], reputation: [] },
};

const SCORECARD = {
  canonConsistency: 4,
  canonConsistencyRationale: "Grounds cleanly in the Ashfall district.",
  choiceDensity: 4,
  choiceDensityRationale: "Solid three-branch structure offers viable paths.",
  emotionalStakes: 3,
  emotionalStakesRationale: "Morally grey choices but stakes could be higher.",
  novelty: 3,
  noveltyRationale: "Rival fixer theme is well-trodden but fits.",
  integrationCost: 2,
  integrationCostRationale: "Stub implementation lacks complex variables.",
  aggregate: 3,
  contradictions: [],
  notes: "Solid three-branch structure; grounds cleanly in the Ashfall district.",
};

// Reactive/ambient storylet (SPEC-26): a fire-once bark gated on the quest's `heard_sable` flag.
// Salience drives flavor only — never a main-plot beat (which stays behind explicit quest flags).
const STORYLETS = {
  storylets: [
    {
      id: "storylet.sable_watching",
      preconditions: [
        { kind: "flag_is", flag: "flag.heard_sable", equals: true },
        {
          kind: "not",
          of: { kind: "flag_is", flag: "flag.bark_sable_watching_seen", equals: true },
        },
      ],
      salience: 15,
      tags: ["ambient", "rival"],
      content: {
        ambient: "Across the district, Sable is already telling your story their way.",
      },
      effects: [{ kind: "set_flag", flag: "flag.bark_sable_watching_seen", to: true }],
    },
  ],
};

export const DEMO_RESPONSES: Record<string, string> = {
  "TASK:ARC": JSON.stringify(ARC),
  "TASK:REFERENCES": JSON.stringify(REFERENCES),
  "TASK:NPCS": JSON.stringify(NPCS),
  "TASK:QUEST": JSON.stringify(QUEST),
  "TASK:STORYLETS": JSON.stringify(STORYLETS),
  "TASK:SCORECARD": JSON.stringify(SCORECARD),
};

export function demoProvider(): StubProvider {
  return stubByRole(DEMO_RESPONSES);
}
