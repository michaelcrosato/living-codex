/**
 * Static solvability/reachability gate (ARCHITECTURE.md §7): schema-valid ≠ playable. The actual
 * rules live in `@codex/content-loader`'s `staticPlayabilityCheck` (pure + unit-tested) and
 * `auditCanon` (the semantic canon graph, CONTENT_PIPELINE.md §6). This script is the thin CLI:
 * discover packs under `content/`, load + validate them, run both passes, report, exit 1 on any
 * error. Until content exists this finds nothing and exits green.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadPacks, validatePack, auditCanon, staticPlayabilityCheck } from "@codex/content-loader";

const contentRoot = resolve(process.cwd(), "content");

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
if (files.length === 0) {
  console.log("[content:verify] no content packs found yet. OK.");
  process.exit(0);
}

const raw = files.map((f) => JSON.parse(readFileSync(f, "utf8")) as unknown);
const { registries } = loadPacks(raw);
const packs = raw.map((r, i) => validatePack(r, `#${i}`));
const errors: string[] = [];

// Canon assertion graph (CONTENT_PIPELINE.md §6): semantic contradictions the ID-level index
// can't see — a broke patron who funds a faction, a dead NPC still placed in the world, allies
// who are also enemies, or an assertion pointing at a nonexistent entity.
for (const c of auditCanon(packs, registries)) {
  errors.push(`canon [${c.rule}]: ${c.message} (packs: ${c.sources.join(", ")})`);
}

// Solvability / reachability / exit-bounds / offerWhen / dead-storylet rules (pure + unit-tested).
const { errors: playabilityErrors, warnings } = staticPlayabilityCheck(registries);
errors.push(...playabilityErrors);

if (warnings.length > 0) {
  console.warn(
    `[content:verify] ${warnings.length} warning(s):\n` +
      warnings.map((w) => `  - ${w}`).join("\n"),
  );
}

if (errors.length > 0) {
  console.error(
    `[content:verify] FAILED (${errors.length} issue(s)):\n` +
      errors.map((e) => `  - ${e}`).join("\n"),
  );
  process.exit(1);
}
console.log(
  `[content:verify] OK — ${registries.quests.size} quest(s) solvable & reachable, ` +
    `${registries.locations.size} locations, ${registries.storylets.size} storylet(s) satisfiable, ` +
    `all unlock_exit indices in range, no contradictory gates, canon assertion graph consistent.`,
);
