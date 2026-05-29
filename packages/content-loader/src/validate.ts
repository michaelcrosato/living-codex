import { ContentPack } from "@codex/content-schema";

/** Zod-validate a single raw pack, raising a readable error keyed to where it failed. */
export function validatePack(raw: unknown, label?: string): ContentPack {
  const result = ContentPack.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `    - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Content pack ${label ?? "(unknown)"} failed schema validation:\n${issues}`);
  }
  return result.data;
}
