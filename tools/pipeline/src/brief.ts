import { z } from "zod";

/** A brief seeds a cycle (CONTENT_PIPELINE.md §5). Short, human-written or template-filled. */
export const Brief = z.object({
  intent: z.string().min(1),
  constraints: z.array(z.string()).default([]),
  ground_in: z.array(z.string()).default([]),
  budget: z
    .object({
      npcs: z.number().int().nonnegative().default(0),
      quests: z.number().int().nonnegative().default(0),
      locations: z.number().int().nonnegative().default(0),
    })
    // Zod 4: `.default({})` would require {} to match the OUTPUT type; `.prefault({})` applies the
    // empty object as INPUT so the inner field defaults fill in (the intended v3 behavior). (SPEC-16)
    .prefault({}),
  tone: z.string().default(""),
});
export type Brief = z.infer<typeof Brief>;

/** Parse a brief from a plain intent string or a partial object. */
export function makeBrief(input: string | Partial<z.input<typeof Brief>>): Brief {
  return Brief.parse(typeof input === "string" ? { intent: input } : input);
}
