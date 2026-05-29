import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { makeBrief } from "./brief";
import { stubByRole } from "./llm/stub";
import { runCycle } from "./pipelines/cycle";

const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const { registries } = loadPacks([raw]);

const ARC = JSON.stringify({
  title: "The Rival Fixer",
  premise: "A smoother operator poaches Varga's jobs.",
  beats: ["Meet the rival", "A test job", "Pick a side"],
  branches: [
    { label: "Loyal to Varga", approach: "talk", stakes: "Trust deepens." },
    { label: "Play both", approach: "tech", stakes: "Both watch you." },
    { label: "Take it by force", approach: "force", stakes: "Lasting enemies." },
  ],
});
const SCORE = JSON.stringify({
  canonConsistency: 8,
  choiceDensity: 8,
  emotionalStakes: 7,
  novelty: 6,
  integrationCost: 4,
  contradictions: [],
  notes: "Clean three-branch structure.",
});

describe("runCycle (P1 shell: canon -> Architect arc -> Critic scorecard)", () => {
  it("produces a deterministic, schema-valid result from a stubbed ensemble", async () => {
    const provider = stubByRole({ ARCHITECT: ARC, CRITIC: SCORE });
    const result = await runCycle({
      brief: makeBrief("Introduce a rival fixer."),
      provider,
      registries,
      packIds: ["pack.opening"],
    });
    expect(result.arc.branches).toHaveLength(3);
    expect(result.arc.title).toBe("The Rival Fixer");
    expect(result.scorecard.canonConsistency).toBe(8);
    // the canon the ensemble was grounded in includes existing ids
    expect(result.canon.entities.some((e) => e.id === "npc.varga")).toBe(true);

    // deterministic: same stub + brief => identical result
    const again = await runCycle({
      brief: makeBrief("Introduce a rival fixer."),
      provider,
      registries,
      packIds: ["pack.opening"],
    });
    expect(JSON.stringify(again)).toBe(JSON.stringify(result));
  });
});
