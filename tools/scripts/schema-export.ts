/**
 * Exports the Zod content schema to JSON Schema for the offline pipeline (SCHEMA.md §0).
 * Writes schema/generated/content-pack.schema.json.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { toJsonSchema } from "@codex/content-schema";

const outPath = resolve(process.cwd(), "schema/generated/content-pack.schema.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(toJsonSchema(), null, 2) + "\n", "utf8");
console.log(`[schema:export] wrote ${outPath}`);
