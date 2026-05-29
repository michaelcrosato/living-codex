import { zodToJsonSchema } from "zod-to-json-schema";
import { ContentPack } from "./pack";

/**
 * Exports the content treaty as JSON Schema to constrain LLM structured output in the
 * offline pipeline (SCHEMA.md §0, "Define once, use on both sides"). The pipeline feeds
 * this to the model so proposals validate before they ever reach the loader.
 */
export function toJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(ContentPack, { name: "ContentPack", $refStrategy: "root" }) as Record<
    string,
    unknown
  >;
}
