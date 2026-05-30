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
    "",
    `| Criterion | Score | Rationale |`,
    `|---|---|---|`,
    `| canonConsistency | ${s.canonConsistency}/5 | ${s.canonConsistencyRationale} |`,
    `| choiceDensity | ${s.choiceDensity}/5 | ${s.choiceDensityRationale} |`,
    `| emotionalStakes | ${s.emotionalStakes}/5 | ${s.emotionalStakesRationale} |`,
    `| novelty | ${s.novelty}/5 | ${s.noveltyRationale} |`,
    `| integrationCost | ${s.integrationCost}/5 | ${s.integrationCostRationale} |`,
    `| **aggregate** | **${s.aggregate}/5** | — |`,
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

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A static, self-contained HTML review page (CONTENT_PIPELINE.md §2 step 4 / T-14b): the arc,
 * the Critic scorecard, the candidate's NPCs/quests, flagged contradictions, and an accept /
 * edit / reject control per proposal. No server, no build — open it and curate.
 */
export function renderBundleHtml(bundle: CurationBundle): string {
  const s = bundle.scorecard;
  const score = (label: string, value: number, rationale: string): string =>
    `<div class="score">` +
    `<div style="display:flex; justify-content:space-between; align-items:center;">` +
    `<strong>${label}</strong>` +
    `<b style="color:#2bd1ff; font-size:1.2rem;">${value}/5</b>` +
    `</div>` +
    `<p style="margin:4px 0 0 0; font-size:0.85rem; color:#a8a9ad;">${esc(rationale)}</p>` +
    `</div>`;

  const npcRows = bundle.candidate.npcs
    .map((n) => `<li><code>${esc(n.id)}</code> — ${esc(n.name)} <em>${esc(n.bio.role)}</em></li>`)
    .join("");
  const questRows = bundle.candidate.quests
    .map(
      (q) => `<li><code>${esc(q.id)}</code> — ${esc(q.title)} (${q.branches.length} branches)</li>`,
    )
    .join("");
  const flagged = bundle.flagged.length
    ? `<ul class="flagged">${bundle.flagged.map((f) => `<li>⚠ ${esc(f)}</li>`).join("")}</ul>`
    : `<p class="ok">No contradictions flagged.</p>`;
  const decision = (id: string): string =>
    `<fieldset class="decision"><legend>${esc(id)}</legend>` +
    `<label><input type="radio" name="${esc(id)}" checked /> accept</label> ` +
    `<label><input type="radio" name="${esc(id)}" /> edit</label> ` +
    `<label><input type="radio" name="${esc(id)}" /> reject</label></fieldset>`;
  const decisions = [
    ...bundle.candidate.npcs.map((n) => n.id),
    ...bundle.candidate.quests.map((q) => q.id),
  ]
    .map((id) => decision(id))
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Curation — ${esc(bundle.candidate.id)}</title>
<style>
  body { font-family: ui-monospace, monospace; max-width: 880px; margin: 40px auto; padding: 0 16px; background:#0b0e14; color:#cfe6f5; line-height:1.5; }
  h1 { color:#2bd1ff; } code { color:#ffd166; } em { color:#8a93a3; }
  .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin:12px 0; }
  .score { background:#161b26; border:1px solid #243; border-radius:6px; padding:8px 12px; }
  .flagged li { color:#ff8a5a; } .ok { color:#7bd88f; }
  .decision { border:1px solid #243; border-radius:6px; margin:8px 0; }
  blockquote { color:#8a93a3; border-left:2px solid #2bd1ff; padding-left:12px; }
</style></head>
<body>
  <h1>Curation bundle — ${esc(bundle.proposals.arc.title)}</h1>
  <p><b>Brief:</b> ${esc(bundle.brief.intent)}</p>
  <p><b>Candidate:</b> <code>${esc(bundle.candidate.id)}</code> — ${bundle.candidate.npcs.length} npc, ${bundle.candidate.quests.length} quest, ${bundle.candidate.dialogues.length} dialogue</p>
  <h2>Critic scorecard</h2>
  <div class="grid">
    ${score("canon", s.canonConsistency, s.canonConsistencyRationale)}
    ${score("choice", s.choiceDensity, s.choiceDensityRationale)}
    ${score("stakes", s.emotionalStakes, s.emotionalStakesRationale)}
    ${score("novelty", s.novelty, s.noveltyRationale)}
    ${score("integration", s.integrationCost, s.integrationCostRationale)}
    <div class="score" style="border: 1px solid #2bd1ff;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong style="color:#2bd1ff;">aggregate</strong>
        <b style="color:#2bd1ff; font-size:1.2rem;">${s.aggregate}/5</b>
      </div>
      <p style="margin:4px 0 0 0; font-size:0.85rem; color:#8a93a3;">Overall summary</p>
    </div>
  </div>
  ${s.notes ? `<blockquote>${esc(s.notes)}</blockquote>` : ""}
  <h2>Arc</h2>
  <p>${esc(bundle.proposals.arc.premise)}</p>
  <ol>${bundle.proposals.arc.beats.map((b) => `<li>${esc(b)}</li>`).join("")}</ol>
  <h2>Candidate content</h2>
  <ul>${npcRows}${questRows}</ul>
  <h2>Flagged for the human</h2>
  ${flagged}
  <h2>Decisions</h2>
  ${decisions}
</body></html>
`;
}
