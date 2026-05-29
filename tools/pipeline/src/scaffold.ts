import { ContentPack, type ContentPack as Pack } from "@codex/content-schema";

/**
 * Authoring DX (S3.4): produce a minimal, treaty-valid empty pack to start authoring from.
 * Validated through ContentPack.parse so a scaffold is never born invalid; the `content:new`
 * CLI writes it to disk alongside an ink/ directory.
 */
export interface ScaffoldOptions {
  name: string;
  title?: string;
  dependsOn?: readonly string[];
}

export function scaffoldPack(opts: ScaffoldOptions): Pack {
  const id = opts.name.startsWith("pack.") ? opts.name : `pack.${opts.name}`;
  return ContentPack.parse({
    id,
    version: "0.1.0",
    title: opts.title ?? id,
    dependsOn: opts.dependsOn ?? [],
    provenance: { authoredBy: "human", models: [] },
    factions: [],
    items: [],
    locations: [],
    npcs: [],
    quests: [],
    dialogues: [],
  });
}
