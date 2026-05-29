/**
 * Static solvability/reachability pass (ARCHITECTURE.md §7): schema-valid ≠ playable.
 * Beyond the loader's referential integrity, this catches content that would be unwinnable
 * or that points an effect at a nonexistent slot:
 *   - every quest has ≥1 branch whose objectives are individually satisfiable in principle;
 *   - every `unlock_exit` effect's exitIndex is within the target location's exits array
 *     (the loader checks the location id exists, but NOT that the index is in range).
 * Until content exists this finds nothing and exits green.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadPacks, validatePack, auditCanon } from "@codex/content-loader";
import type { Effect, Objective, Quest } from "@codex/content-schema";

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

// Locations you can actually enter: the destination of some exit. A reach() target that is an
// island (no exits in OR out) is unwinnable — something the loader's ref-integrity can't catch.
const enterable = new Set<string>();
for (const loc of registries.locations.values()) {
  for (const exit of loc.exits) enterable.add(exit.toLocationId);
}

/** An objective is satisfiable-in-principle if its referenced entity exists and bounds hold. */
function objectiveSatisfiable(obj: Objective): boolean {
  switch (obj.kind) {
    case "reach":
      return registries.locations.has(obj.locationId);
    case "retrieve":
      return obj.count > 0;
    case "defeat":
      return registries.npcs.has(obj.npcId);
    case "talk_to":
      return registries.npcs.has(obj.npcId);
    case "skill_check":
      return obj.dc <= 20; // a natural 20 (+skill) can always clear a dc ≤ 20
    case "set_flag":
      return true;
  }
}

function checkUnlockExits(effects: readonly Effect[], where: string): void {
  for (const effect of effects) {
    if (effect.kind !== "unlock_exit") continue;
    const location = registries.locations.get(effect.locationId);
    const count = location?.exits.length ?? 0;
    if (effect.exitIndex >= count) {
      errors.push(
        `${where}: unlock_exit index ${effect.exitIndex} out of range for "${effect.locationId}" (has ${count} exit(s)).`,
      );
    }
  }
}

function checkQuest(quest: Quest): void {
  const solvableBranch = quest.branches.find((b) => b.objectives.every(objectiveSatisfiable));
  if (!solvableBranch) {
    errors.push(`${quest.id}: no branch is solvable from the initial state.`);
  }
  for (const branch of quest.branches) {
    checkUnlockExits(branch.onComplete, `${quest.id}.branches.${branch.id}.onComplete`);
    checkUnlockExits(branch.onFail, `${quest.id}.branches.${branch.id}.onFail`);
    for (const obj of branch.objectives) {
      if (obj.kind === "skill_check") {
        checkUnlockExits(obj.onFail, `${quest.id}.branches.${branch.id}.skill_check.onFail`);
      }
    }
  }
  checkUnlockExits(quest.onAnyComplete, `${quest.id}.onAnyComplete`);
}

/** Every reach() target must be connected to the location graph (catches island locations). */
function checkReachability(quest: Quest): void {
  for (const branch of quest.branches) {
    for (const obj of branch.objectives) {
      if (obj.kind !== "reach") continue;
      const loc = registries.locations.get(obj.locationId);
      const connected = enterable.has(obj.locationId) || (loc?.exits.length ?? 0) > 0;
      if (loc && !connected) {
        errors.push(
          `${quest.id}.${branch.id}: reach target "${obj.locationId}" is an island (no exits in or out) — unreachable.`,
        );
      }
    }
  }
}

/** A quest with directly contradictory flag_is gates in offerWhen can never be offered. */
function checkOfferWhen(quest: Quest): void {
  const seen = new Map<string, boolean | number | string>();
  for (const cond of quest.offerWhen) {
    if (cond.kind !== "flag_is") continue;
    const prev = seen.get(cond.flag);
    if (prev !== undefined && prev !== cond.equals) {
      errors.push(
        `${quest.id}.offerWhen: contradictory flag_is on "${cond.flag}" — the quest can never be offered.`,
      );
    }
    seen.set(cond.flag, cond.equals);
  }
}

for (const quest of registries.quests.values()) {
  checkQuest(quest);
  checkReachability(quest);
  checkOfferWhen(quest);
}

if (errors.length > 0) {
  console.error(`[content:verify] FAILED (${errors.length} issue(s)):\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(
  `[content:verify] OK — ${registries.quests.size} quest(s) solvable & reachable, ` +
    `${registries.locations.size} locations, all unlock_exit indices in range, ` +
    `no contradictory gates, canon assertion graph consistent.`,
);
