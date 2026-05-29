import type { Registries } from "@codex/content-loader";

/**
 * The canon index (CONTENT_PIPELINE.md §6): every entity id, kind, name, and one-liner. Small
 * enough to fit in any model's context, so proposals avoid reinventing or colliding with IDs.
 * It is the grounding context every role receives.
 */
export interface CanonEntity {
  id: string;
  kind: "faction" | "npc" | "location" | "item" | "quest";
  name: string;
  summary: string;
}

export interface CanonIndex {
  entities: CanonEntity[];
  packs: string[];
}

function clip(text: string, max = 100): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function buildCanonIndex(registries: Registries, packIds: readonly string[] = []): CanonIndex {
  const entities: CanonEntity[] = [];
  for (const f of registries.factions.values()) entities.push({ id: f.id, kind: "faction", name: f.name, summary: clip(f.ethos) });
  for (const n of registries.npcs.values()) entities.push({ id: n.id, kind: "npc", name: n.name, summary: clip(n.bio.role) });
  for (const l of registries.locations.values()) entities.push({ id: l.id, kind: "location", name: l.name, summary: clip(l.mood) });
  for (const i of registries.items.values()) entities.push({ id: i.id, kind: "item", name: i.name, summary: clip(i.description) });
  for (const q of registries.quests.values()) entities.push({ id: q.id, kind: "quest", name: q.title, summary: clip(q.summary) });
  entities.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { entities, packs: [...packIds].sort() };
}

/** Render the canon index as compact grounding text for a prompt. */
export function renderCanon(index: CanonIndex): string {
  if (index.entities.length === 0) return "(no existing canon)";
  return index.entities.map((e) => `- ${e.id} [${e.kind}] "${e.name}": ${e.summary}`).join("\n");
}
