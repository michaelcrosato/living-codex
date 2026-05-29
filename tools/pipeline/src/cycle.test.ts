import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks, hashValue } from "@codex/content-loader";
import { ContentPack } from "@codex/content-schema";
import { makeBrief } from "./brief";
import { demoProvider } from "./demo-fixture";
import { runCycle } from "./pipelines/cycle";
import { renderBundleMarkdown } from "./bundle";

const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const { registries, fingerprint } = loadPacks([raw]);

/** The recorded golden hash: fixed brief + the demo ensemble => this exact candidate pack. */
const GOLDEN_HASH = "06bd6ac6e3b234";

const run = () =>
  runCycle({
    brief: makeBrief("Introduce a rival fixer"),
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
});
