import { z } from "zod";
import { StoryletId, DialogueId } from "./ids";
import { Condition } from "./condition";
import { Effect } from "./effect";

/**
 * Storylets (SPEC-11): quality-based narrative content units.
 * A storylet contains preconditions that must be met in the World,
 * a salience score, tags, and the content (a dialogue override or ambient text)
 * and effects that run when selected.
 */
export const Storylet = z.object({
  id: StoryletId,
  preconditions: z.array(Condition).default([]),
  salience: z.number().int().default(0),
  tags: z.array(z.string()).default([]),
  content: z.object({
    dialogueId: DialogueId.optional(),
    ambient: z.string().optional(),
  }),
  effects: z.array(Effect).default([]),
});

export type Storylet = z.infer<typeof Storylet>;
