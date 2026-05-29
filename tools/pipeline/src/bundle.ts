import type { CurationBundle } from "./pipelines/cycle";

/**
 * The reviewable curation artifact (CONTENT_PIPELINE.md §2 step 4). A human reads this to
 * accept / edit / reject before the bake (P3). Markdown keeps it diffable in version control;
 * the full candidate pack travels as JSON alongside it.
 */
export function renderBundleMarkdown(bundle: CurationBundle): string {
  const s = bundle.scorecard;
  const lines = [
    `# Curation bundle — ${bundle.proposals.arc.title}`,
    "",
    `**Brief:** ${bundle.brief.intent}`,
    `**Candidate pack:** \`${bundle.candidate.id}\` (${bundle.candidate.npcs.length} npc, ${bundle.candidate.quests.length} quest, ${bundle.candidate.dialogues.length} dialogue)`,
    "",
    "## Critic scorecard",
    `| canon | choice | stakes | novelty | integration |`,
    `|---|---|---|---|---|`,
    `| ${s.canonConsistency} | ${s.choiceDensity} | ${s.emotionalStakes} | ${s.novelty} | ${s.integrationCost} |`,
    "",
    s.notes ? `> ${s.notes}` : "",
    "",
    "## Arc",
    bundle.proposals.arc.premise,
    ...bundle.proposals.arc.beats.map((b, i) => `${i + 1}. ${b}`),
    "",
    "### Branches",
    ...bundle.proposals.arc.branches.map((b) => `- **${b.label}** (${b.approach}) — ${b.stakes}`),
    "",
    "## Flagged for the human",
    bundle.flagged.length ? bundle.flagged.map((f) => `- ⚠ ${f}`).join("\n") : "- none",
  ];
  return lines.filter((l) => l !== undefined).join("\n") + "\n";
}
