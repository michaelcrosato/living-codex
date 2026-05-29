import type { Npc, NpcId } from "@codex/content-schema";
import type { System } from "../tick";
import type { GameEvent } from "../events/event";
import { evaluateAll } from "../conditions/conditions";

/**
 * The reactions system (S1.1) — makes "the world remembers" real (GOAL Pillar). For each NPC
 * whose `reactsTo` conditions hold, it sets the declared flags and swaps the NPC's active
 * dialogue. Autonomous (no input). Idempotent by construction: it emits a SetFlag/SetNpcDialogue
 * only when the world isn't already at the target value, so reactions latch once and never spam
 * the event log or oscillate.
 */
export function reactionsSystem(npcs: ReadonlyMap<NpcId, Npc>): System {
  return (world) => {
    const events: GameEvent[] = [];
    for (const npc of npcs.values()) {
      for (const reaction of npc.reactsTo) {
        if (!evaluateAll(world, reaction.when)) continue;
        for (const flagEffect of reaction.setsFlags) {
          if (world.flags[flagEffect.flag] !== flagEffect.to) {
            events.push({ type: "SetFlag", flag: flagEffect.flag, to: flagEffect.to });
          }
        }
        if (
          reaction.overrideDialogueId &&
          world.npcDialogue[npc.id] !== reaction.overrideDialogueId
        ) {
          events.push({ type: "SetNpcDialogue", npcId: npc.id, dialogueId: reaction.overrideDialogueId });
        }
      }
    }
    return events;
  };
}
