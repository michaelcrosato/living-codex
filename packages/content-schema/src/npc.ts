import { z } from "zod";
import { NpcId, FactionId, DialogueId } from "./ids";
import { Condition } from "./condition";
import { FlagEffect } from "./effect";

/** NPCs (SCHEMA.md §3): deep characterization, but all behavior is data the engine understands. */
export const Npc = z.object({
  id: NpcId,
  name: z.string().max(60),
  faction: FactionId.optional(),
  appearance: z.object({
    bodyColor: z.string(),
    accentColor: z.string(),
    silhouette: z.enum(["humanoid", "tall", "stocky", "cloaked", "mech", "beast"]),
  }),
  bio: z.object({
    role: z.string().max(80),
    backstory: z.string().max(1200),
    wants: z.string().max(240),
    fears: z.string().max(240),
    voice: z.string().max(240),
    secrets: z.array(z.string().max(240)).max(5).default([]),
  }),
  dialogueId: DialogueId,
  reactsTo: z
    .array(
      z.object({
        when: z.array(Condition).min(1),
        setsFlags: z.array(FlagEffect).default([]),
        overrideDialogueId: DialogueId.optional(),
      }),
    )
    .default([]),
});
export type Npc = z.infer<typeof Npc>;
