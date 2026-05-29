/**
 * Exports the canon index (CONTENT_PIPELINE.md §2 step 1) to content/canon-index.json — the
 * grounding context every model receives. Loads all content packs through the real loader.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { buildCanonIndex } from "@codex/pipeline";

const contentRoot = resolve(process.cwd(), "content");
const outPath = resolve(contentRoot, "canon-index.json");

function findPackFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...findPackFiles(full));
    else if (entry === "pack.json") found.push(full);
  }
  return found;
}

const files = findPackFiles(contentRoot);
const raw = files.map((f) => JSON.parse(readFileSync(f, "utf8")) as unknown);
const { registries, fingerprint } = files.length
  ? loadPacks(raw)
  : { registries: undefined, fingerprint: { packs: {} } };

const index = registries
  ? buildCanonIndex(registries, Object.keys(fingerprint.packs))
  : { entities: [], packs: [] };

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(index, null, 2) + "\n", "utf8");
console.log(`[pipeline:export] wrote ${outPath} — ${index.entities.length} canon entities.`);
