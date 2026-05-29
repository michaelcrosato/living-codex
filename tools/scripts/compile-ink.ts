/**
 * Author→compile helper: compiles each content/<pack>/ink/<name>.ink into the matching
 * `dialogue.<name>` DialogueAsset in that pack's pack.json (sets compiled + sourceHash).
 * Keeps hand-authored Ink as readable source while the engine consumes compiled JSON.
 * Usage: pnpm content:compile-ink [packDir]   (default: content/core/pack.opening)
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { compileInk } from "@codex/narrative-ink";
import { hashValue } from "@codex/content-loader";

interface DialogueAssetLike {
  id: string;
  compiled: unknown;
  sourceHash: string;
}
interface PackLike {
  dialogues: DialogueAssetLike[];
}

const packDir = process.argv[2] ?? "content/core/pack.opening";
const packPath = resolve(process.cwd(), packDir, "pack.json");
const inkDir = resolve(process.cwd(), packDir, "ink");

const pack = JSON.parse(readFileSync(packPath, "utf8")) as PackLike;
let inkFiles: string[];
try {
  inkFiles = readdirSync(inkDir).filter((f) => f.endsWith(".ink"));
} catch {
  console.log(`[compile-ink] no ink/ directory in ${packDir}; nothing to compile.`);
  process.exit(0);
}

let updated = 0;
for (const file of inkFiles) {
  const id = `dialogue.${basename(file, ".ink")}`;
  const source = readFileSync(join(inkDir, file), "utf8");
  const dialogue = pack.dialogues.find((d) => d.id === id);
  if (!dialogue) {
    console.warn(`[compile-ink] WARN: no ${id} in ${packDir}/pack.json (skipped ${file})`);
    continue;
  }
  dialogue.compiled = compileInk(source);
  dialogue.sourceHash = hashValue(source);
  updated += 1;
}

writeFileSync(packPath, JSON.stringify(pack, null, 2) + "\n", "utf8");
console.log(`[compile-ink] ${packDir}: compiled ${updated} dialogue(s).`);
