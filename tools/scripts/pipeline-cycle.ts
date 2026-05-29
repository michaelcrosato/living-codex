/**
 * Runs one content cycle (CONTENT_PIPELINE.md §2): `pnpm pipeline:cycle --brief "..."`.
 * Uses OpenRouter when OPENROUTER_API_KEY is set; otherwise the shared demo stub so the full
 * decomposition + curation bundle is runnable offline. Real generation requires a key.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadPacks, validatePack } from "@codex/content-loader";
import {
  makeBrief,
  runCycle,
  OpenRouterProvider,
  demoProvider,
  renderBundleMarkdown,
  renderBundleHtml,
  type ModelProvider,
} from "@codex/pipeline";

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

const briefFlag = process.argv.indexOf("--brief");
const intent =
  briefFlag >= 0 && process.argv[briefFlag + 1]
    ? process.argv[briefFlag + 1]!
    : "Introduce a rival fixer who competes with Varga for the player's loyalty.";

const files = findPackFiles(resolve(process.cwd(), "content"));
const raw = files.map((f) => JSON.parse(readFileSync(f, "utf8")) as unknown);
const { registries, fingerprint } = loadPacks(raw);
const priorPacks = raw.map((r, i) => validatePack(r, `#${i}`));

const provider: ModelProvider = process.env.OPENROUTER_API_KEY
  ? new OpenRouterProvider({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.PIPELINE_MODEL ?? "anthropic/claude-opus-4.6",
    })
  : demoProvider();

if (!process.env.OPENROUTER_API_KEY) {
  console.log("[pipeline:cycle] no OPENROUTER_API_KEY — running the built-in demo stub.\n");
}

const bundle = await runCycle({
  brief: makeBrief(intent),
  provider,
  registries,
  packIds: Object.keys(fingerprint.packs),
  priorPacks,
});

console.log(renderBundleMarkdown(bundle));
console.log(`\n--- candidate pack (${bundle.candidate.id}) ---`);
console.log(JSON.stringify(bundle.candidate, null, 2));

const htmlFlag = process.argv.indexOf("--html");
if (htmlFlag >= 0 && process.argv[htmlFlag + 1]) {
  const htmlPath = resolve(process.cwd(), process.argv[htmlFlag + 1]!);
  writeFileSync(htmlPath, renderBundleHtml(bundle), "utf8");
  console.log(`\n[pipeline:cycle] wrote review page → ${htmlPath}`);
}
