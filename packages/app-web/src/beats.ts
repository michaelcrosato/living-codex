import type { World } from "@codex/engine-core";

/**
 * Lightweight beat instrumentation for the vertical slice (VERTICAL_SLICE.md §2). Derives which
 * narrative beats a session has reached from World state — for the HUD, the e2e walk, and the
 * "measurable acceptance" instrumentation (T-15). Pure read; never mutates.
 */
export interface Beats {
  metStranger: boolean;
  metVarga: boolean;
  acceptedQuest: boolean;
  solved: boolean;
  sawConsequence: boolean;
}

function flag(world: World, key: string): boolean {
  return Object.entries(world.flags).some(([k, v]) => k === key && v === true);
}

export function beats(world: World): Beats {
  const quest = Object.values(world.quests)[0];
  return {
    metStranger: flag(world, "flag.met_stranger"),
    metVarga: flag(world, "flag.met_varga"),
    acceptedQuest: quest !== undefined && (quest.status === "active" || quest.status === "completed"),
    solved: flag(world, "flag.has_drive"),
    sawConsequence:
      flag(world, "flag.entered_peacefully") ||
      flag(world, "flag.entered_unseen") ||
      flag(world, "flag.syndicate_marked"),
  };
}

/** A compact progress line for the HUD. */
export function beatsLine(world: World): string {
  const b = beats(world);
  const dot = (done: boolean): string => (done ? "●" : "○");
  return `${dot(b.metStranger)} stranger  ${dot(b.metVarga)} varga  ${dot(b.acceptedQuest)} job  ${dot(b.solved)} drive  ${dot(b.sawConsequence)} aftermath`;
}
