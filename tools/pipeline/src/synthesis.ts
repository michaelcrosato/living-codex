import {
  ContentPack,
  type ContentPack as Pack,
  type Quest,
  type Storylet,
} from "@codex/content-schema";
import { compileInk } from "@codex/narrative-ink";
import { hashValue } from "@codex/content-loader";
import type { ArcSkeleton, DramatistOutput, ReferenceSet } from "./schemas/proposals";
import type { Brief } from "./brief";

/**
 * Synthesis (CONTENT_PIPELINE.md §4 final arrow): assemble the role outputs into a candidate
 * ContentPack — compiling each Dramatist Ink source into a DialogueAsset, wiring NPC dialogueIds,
 * attaching provenance — then VALIDATE it against the treaty (ContentPack.parse). Deterministic:
 * compileInk and hashValue are stable, so a fixed brief + fixed proposals => a byte-stable pack
 * (the basis of the golden-master test).
 */
export interface SynthesisInput {
  packId: string;
  title: string;
  brief: Brief;
  arc: ArcSkeleton;
  references: ReferenceSet;
  dramatist: DramatistOutput;
  /** Optional — patron-only briefs (budget.quests = 0) produce a pack with no quest. */
  quest?: Quest;
  /** Optional — reactive/ambient storylets (SPEC-26); empty unless budget.storylets > 0. */
  storylets?: readonly Storylet[];
  models: readonly string[];
  dependsOn?: readonly string[];
}

function dialogueIdFor(npcId: string): string {
  return `dialogue.${npcId.replace(/^npc\./, "")}`;
}

export function synthesize(input: SynthesisInput): Pack {
  const dialogues = input.dramatist.npcs.map((g) => ({
    id: dialogueIdFor(g.id),
    format: "ink-json",
    inkVersion: "21",
    sourceHash: hashValue(g.ink),
    compiled: compileInk(g.ink),
    declaredVars: g.declaredVars,
  }));

  const npcs = input.dramatist.npcs.map((g) => ({
    id: g.id,
    name: g.name,
    ...(g.faction ? { faction: g.faction } : {}),
    appearance: g.appearance,
    bio: g.bio,
    ...(g.combat ? { combat: g.combat } : {}),
    dialogueId: dialogueIdFor(g.id),
    reactsTo: [],
  }));

  const candidate = {
    id: input.packId,
    version: "0.1.0",
    title: input.title,
    dependsOn: input.dependsOn ?? [],
    provenance: {
      authoredBy: "pipeline",
      models: [...input.models],
      promptHash: hashValue({ brief: input.brief, arc: input.arc, references: input.references }),
    },
    factions: [],
    items: [],
    locations: [],
    npcs,
    quests: input.quest ? [input.quest] : [],
    dialogues,
    storylets: input.storylets ? [...input.storylets] : [],
  };

  return ContentPack.parse(candidate);
}
