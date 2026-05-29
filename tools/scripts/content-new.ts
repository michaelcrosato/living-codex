/**
 * Authoring scaffold (S3.4): `pnpm content:new <name> [--generated] [--title "..."]`.
 * Creates content/<core|generated>/pack.<name>/pack.json from a treaty-valid empty pack plus an
 * ink/ directory, so a new pack starts life passing content:validate. Author Ink in ink/, then
 * run `pnpm content:compile-ink content/<scope>/pack.<name>` to compile it in.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { scaffoldPack } from "@codex/pipeline";

const name = process.argv[2];
if (!name || name.startsWith("--")) {
  console.error('Usage: pnpm content:new <name> [--generated] [--title "Pack Title"]');
  process.exit(1);
}

const generated = process.argv.includes("--generated");
const titleFlag = process.argv.indexOf("--title");
const title = titleFlag >= 0 ? process.argv[titleFlag + 1] : undefined;

let pack: ReturnType<typeof scaffoldPack>;
try {
  pack = scaffoldPack(title !== undefined ? { name, title } : { name });
} catch (err) {
  console.error(`[content:new] invalid pack name "${name}": ${(err as Error).message}`);
  process.exit(1);
}

const scope = generated ? "generated" : "core";
const packDir = resolve(process.cwd(), "content", scope, pack.id);
const packPath = resolve(packDir, "pack.json");

if (existsSync(packPath)) {
  console.error(`[content:new] ${packPath} already exists — refusing to overwrite.`);
  process.exit(1);
}

mkdirSync(resolve(packDir, "ink"), { recursive: true });
writeFileSync(packPath, JSON.stringify(pack, null, 2) + "\n", "utf8");
writeFileSync(resolve(packDir, "ink", ".gitkeep"), "", "utf8");

console.log(`[content:new] scaffolded ${pack.id} → content/${scope}/${pack.id}/`);
console.log(`  • edit pack.json, drop *.ink in ink/, then: pnpm content:compile-ink content/${scope}/${pack.id}`);
