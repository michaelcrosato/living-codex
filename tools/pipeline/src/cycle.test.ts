import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks, hashValue } from "@codex/content-loader";
import { ContentPack } from "@codex/content-schema";
import { makeBrief } from "./brief";
import { demoProvider, DEMO_RESPONSES } from "./demo-fixture";
import { runCycle } from "./pipelines/cycle";
import { renderBundleMarkdown } from "./bundle";
import type { ModelRequest, ModelProvider } from "./llm/adapter";

const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const { registries, fingerprint } = loadPacks([raw]);

/** The recorded golden hash: fixed brief + the demo ensemble => this exact candidate pack. */
const GOLDEN_HASH = "0cba213e9d9043";

const run = () =>
  runCycle({
    brief: makeBrief({ intent: "Introduce a rival fixer", budget: { npcs: 1, quests: 1 } }),
    provider: demoProvider(),
    registries,
    packIds: Object.keys(fingerprint.packs),
    packId: "pack.the_rival_fixer",
  });

describe("runCycle — full decomposition + curation bundle (P2)", () => {
  it("assembles a treaty-valid candidate ContentPack from the role outputs", async () => {
    const bundle = await run();
    expect(bundle.proposals.arc.branches).toHaveLength(3);
    expect(bundle.proposals.references.factions).toContain("faction.varga_crew");
    expect(bundle.candidate.npcs.map((n) => n.id)).toEqual(["npc.rival_fixer"]);
    expect(bundle.candidate.quests).toHaveLength(1);
    expect(bundle.candidate.dialogues[0]?.id).toBe("dialogue.rival_fixer");
    expect(bundle.candidate.provenance.authoredBy).toBe("pipeline");
    // it really is treaty-valid (re-parse through the schema)
    expect(ContentPack.safeParse(bundle.candidate).success).toBe(true);
  });

  it("golden master: a fixed brief + stubbed ensemble => a byte-stable candidate pack", async () => {
    const a = await run();
    const b = await run();
    expect(hashValue(a.candidate)).toBe(hashValue(b.candidate)); // deterministic across runs
    expect(hashValue(a.candidate)).toBe(GOLDEN_HASH); // and matches the recorded golden
  });

  it("produces a reviewable curation bundle (scorecard + flagged-for-human)", async () => {
    const bundle = await run();
    expect(bundle.scorecard.canonConsistency).toBe(8);
    expect(Array.isArray(bundle.flagged)).toBe(true);
    const md = renderBundleMarkdown(bundle);
    expect(md).toContain("Curation bundle");
    expect(md).toContain("pack.the_rival_fixer");
  });

  it("hermetic test: asserts that the grounding subgraph is correctly assembled and passed to the provider", async () => {
    const requests: ModelRequest[] = [];
    const spyProvider: ModelProvider = {
      name: "spy",
      complete: async (req: ModelRequest) => {
        requests.push(req);
        for (const [marker, body] of Object.entries(DEMO_RESPONSES)) {
          if (req.system.includes(marker)) return body;
        }
        return "{}";
      },
    };

    await runCycle({
      brief: makeBrief({
        intent: "Introduce a rival fixer",
        budget: { npcs: 1, quests: 1 },
        ground_in: ["npc.varga"],
      }),
      provider: spyProvider,
      registries,
      packIds: Object.keys(fingerprint.packs),
      packId: "pack.the_rival_fixer",
    });

    expect(requests.length).toBeGreaterThan(0);
    // Find architect ARC request
    const arcReq = requests.find((r) => r.system.includes("TASK:ARC"));
    expect(arcReq).toBeDefined();
    // User prompt should contain the Grounding facts section
    expect(arcReq!.user).toContain("# Grounding facts");
    expect(arcReq!.user).toContain("npc.varga is member of faction.varga_crew (from prior_packs_compiled [derived])");
  });
});
