/**
 * Runs one content cycle (CONTENT_PIPELINE.md §2): `pnpm pipeline:cycle --brief "..."`.
 * Uses OpenRouter when OPENROUTER_API_KEY is set; otherwise a built-in demo stub so the CLI is
 * runnable offline. Real generation requires a key; the stub just demonstrates the flow.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import {
  makeBrief,
  runCycle,
  StubProvider,
  OpenRouterProvider,
  type ModelProvider,
  type ModelRequest,
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
const { registries, fingerprint } = loadPacks(files.map((f) => JSON.parse(readFileSync(f, "utf8")) as unknown));

const DEMO: Record<string, string> = {
  ARCHITECT: JSON.stringify({
    title: "The Rival Fixer",
    premise: "A smoother operator sets up across the district and starts poaching Varga's jobs.",
    beats: ["Meet the rival", "Take a test job", "Choose a side or burn both"],
    branches: [
      { label: "Stay loyal to Varga", approach: "talk", stakes: "Varga's trust deepens; the rival turns hostile." },
      { label: "Play them against each other", approach: "tech", stakes: "Both owe you — and both watch you." },
      { label: "Take the contract by force", approach: "force", stakes: "Fast credits, lasting enemies." },
    ],
  }),
  CRITIC: JSON.stringify({
    canonConsistency: 8,
    choiceDensity: 8,
    emotionalStakes: 7,
    novelty: 6,
    integrationCost: 4,
    contradictions: [],
    notes: "Solid three-branch structure; grounds cleanly in the Ashfall district.",
  }),
};

const provider: ModelProvider = process.env.OPENROUTER_API_KEY
  ? new OpenRouterProvider({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.PIPELINE_MODEL ?? "anthropic/claude-opus-4.6",
    })
  : new StubProvider((req: ModelRequest) =>
      Object.entries(DEMO).find(([marker]) => req.system.includes(marker))?.[1] ?? "{}",
    );

if (!process.env.OPENROUTER_API_KEY) {
  console.log("[pipeline:cycle] no OPENROUTER_API_KEY — running the built-in demo stub.\n");
}

const result = await runCycle({
  brief: makeBrief(intent),
  provider,
  registries,
  packIds: Object.keys(fingerprint.packs),
});

console.log(JSON.stringify(result, null, 2));
