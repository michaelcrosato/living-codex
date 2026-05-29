/**
 * Validates every on-disk content pack against the schema + referential integrity (T-03).
 * Discovers content pack.json files, loads them together, and reports. Until real
 * packs land (T-13) this finds none and exits green.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";

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
    if (statSync(full).isDirectory()) {
      found.push(...findPackFiles(full));
    } else if (entry === "pack.json") {
      found.push(full);
    }
  }
  return found;
}

const files = findPackFiles(contentRoot);
if (files.length === 0) {
  console.log("[content:validate] no content packs found yet (authored from T-13). OK.");
  process.exit(0);
}

const raw = files.map((f) => JSON.parse(readFileSync(f, "utf8")) as unknown);
try {
  const { registries, fingerprint } = loadPacks(raw);
  console.log(
    `[content:validate] OK — ${files.length} pack(s): ` +
      `${registries.npcs.size} npcs, ${registries.quests.size} quests, ` +
      `${registries.locations.size} locations. fingerprint=${fingerprint.registriesHash}`,
  );
} catch (err) {
  console.error("[content:validate] FAILED:\n" + (err as Error).message);
  process.exit(1);
}
