import { z } from "zod";
import { ContentPack } from "./pack";

/**
 * Exports the content treaty as JSON Schema to constrain LLM structured output in the
 * offline pipeline (SCHEMA.md §0, "Define once, use on both sides"). The pipeline feeds
 * this to the model so proposals validate before they ever reach the loader.
 *
 * Uses Zod 4's native `z.toJSONSchema` (SPEC-16; replaced the unmaintained zod-to-json-schema).
 * `unrepresentable: "any"` keeps it from throwing on nodes with no JSON-Schema form; recursive
 * subschemas (Condition) are emitted via `$defs`/`$ref` automatically (no more "recursive
 * reference detected" warnings).
 */
export function toJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(ContentPack, { unrepresentable: "any" }) as Record<string, unknown>;
}
