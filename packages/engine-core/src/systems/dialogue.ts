import type { DialogueAsset, DialogueId } from "@codex/content-schema";
import type { System } from "../tick";
import type { GameEvent, InputEvent } from "../events/event";
import type { Narrative } from "../ports/narrative";

/**
 * The dialogue system (T-07). It advances branching dialogue on a `Choose` input by talking
 * to the injected `Narrative` port — it NEVER imports inkjs (vendor isolation, AGENTS.md).
 * On each choice it captures the post-choice Ink state and the declared story-vars, emitting
 * a single `DialogueAdvanced` event. Because the snapshot is captured into the log, replay
 * restores it rather than re-running Ink (WORLD_STATE.md §4).
 */
export interface DialogueContext {
  narrative: Narrative;
  dialogues: ReadonlyMap<DialogueId, DialogueAsset>;
}

export function dialogueSystem(inputs: readonly InputEvent[], ctx: DialogueContext): System {
  return (world) => {
    const events: GameEvent[] = [];
    for (const input of inputs) {
      if (input.type !== "Choose") continue;
      const asset = ctx.dialogues.get(input.dialogueId);
      if (!asset) continue;

      const session = ctx.narrative.load(asset.compiled);
      const prior = world.dialogue[input.dialogueId];
      if (prior) session.load(prior);

      const frame = session.current();
      if (input.choiceIndex < 0 || input.choiceIndex >= frame.choices.length) continue;
      session.choose(input.choiceIndex);
      session.current(); // continue past the choice to the next stable point

      const flags: Record<string, boolean | number | string> = {};
      for (const varName of asset.declaredVars) flags[`flag.${varName}`] = session.getVar(varName);

      events.push({
        type: "DialogueAdvanced",
        dialogueId: input.dialogueId,
        inkState: session.save(),
        flags,
      });
    }
    return events;
  };
}
