import type { Effect } from "@codex/content-schema";
import type { GameEvent } from "./event";

/**
 * The seam that makes "effects map 1:1 to engine Events" real (SCHEMA.md §5). Content can
 * only express things the engine already implements; this is the single place that bridge
 * lives. Quest completion and skill-check failure both route their authored effects through
 * here, so there is one mapping to maintain.
 */
export function effectToEvent(effect: Effect): GameEvent {
  switch (effect.kind) {
    case "set_flag":
      return { type: "SetFlag", flag: effect.flag, to: effect.to };
    case "adjust_reputation":
      return { type: "AdjustReputation", factionId: effect.factionId, delta: effect.delta };
    case "give_item":
      return { type: "GiveItem", itemId: effect.itemId, count: effect.count };
    case "modify_skill":
      return { type: "ModifySkill", skill: effect.skill, delta: effect.delta };
    case "start_quest":
      return { type: "StartQuest", questId: effect.questId };
    case "show_text":
      return { type: "ShowText", text: effect.text };
    case "unlock_exit":
    case "set_npc_dialogue":
      // Honest gap: these need World-shape extensions not in WORLD_STATE.md §1 and no slice
      // content uses them yet. Add them (versioned) when a quest first needs the verb.
      throw new Error(
        `effectToEvent: effect "${effect.kind}" is not yet implemented by the engine.`,
      );
    default: {
      const exhaustive: never = effect;
      throw new Error(`effectToEvent: unhandled effect ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function effectsToEvents(effects: readonly Effect[]): GameEvent[] {
  return effects.map(effectToEvent);
}
