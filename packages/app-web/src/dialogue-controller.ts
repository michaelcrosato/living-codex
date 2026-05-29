import type { Registries } from "@codex/content-loader";
import type { DialogueId, NpcId } from "@codex/content-schema";
import { currentDialogueId, type Narrative, type StoryFrame, type World } from "@codex/engine-core";

export interface OpenDialogue {
  dialogueId: DialogueId;
  npcName: string;
  frame: StoryFrame;
}

/**
 * Reads the current dialogue frame for an NPC straight from `World` (T-12 dialogue UI). It
 * resolves the NPC's CURRENT dialogue (honoring reaction/effect overrides via currentDialogueId)
 * and restores the captured Ink snapshot, so the panel always reflects engine state. It never
 * mutates state — advancing happens through the dialogue system via a Choose input.
 */
export class DialogueController {
  constructor(
    private readonly registries: Registries,
    private readonly narrative: Narrative,
  ) {}

  openFor(world: World, npcId: string): OpenDialogue | null {
    const npc = this.registries.npcs.get(npcId as NpcId);
    if (!npc) return null;
    const dialogueId = currentDialogueId(world, npcId, npc.dialogueId);
    const asset = this.registries.dialogues.get(dialogueId);
    if (!asset) return null;
    const session = this.narrative.load(asset.compiled);
    const prior = world.dialogue[dialogueId];
    if (prior) session.load(prior);
    return { dialogueId, npcName: npc.name, frame: session.current() };
  }
}
