/**
 * Bakes the Drip patrons to content/generated/pack.the_drip_patrons/pack.json (T-14c).
 * Runs the patron cycle (offline demo ensemble), stamps curation provenance, writes the pack.
 * The result loads through the IDENTICAL content-loader path as hand-authored content.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { makeBrief, runCycle, dripPatronsProvider, finalizeProvenance } from "@codex/pipeline";

const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const { registries, fingerprint } = loadPacks([raw]);

const bundle = await runCycle({
  brief: makeBrief({
    intent: "Populate the Drip with regulars and a hook NPC",
    budget: { npcs: 9, quests: 0, locations: 0 },
    tone: "noir, terse, lived-in",
  }),
  provider: dripPatronsProvider(),
  registries,
  packIds: Object.keys(fingerprint.packs),
  packId: "pack.the_drip_patrons",
  models: ["stub:architect", "stub:dramatist", "stub:critic"],
});

const finalized = finalizeProvenance(bundle.candidate, {
  curatedBy: "operator",
  approvedAt: "2026-05-28T00:00:00.000Z",
});

const outPath = resolve(process.cwd(), "content/generated/pack.the_drip_patrons/pack.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(finalized, null, 2) + "\n", "utf8");
console.log(
  `[pipeline:bake] wrote ${outPath} — ${finalized.npcs.length} npcs, ${finalized.dialogues.length} dialogues. ` +
    `flagged: ${bundle.flagged.length}`,
);
