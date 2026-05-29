import type { Storylet, StoryletId } from "@codex/content-schema";
import type { System } from "../tick";
import { evaluateAll } from "../conditions/conditions";

/**
 * The storylet system (SPEC-11).
 * Filters all loaded storylets by their preconditions, ranks by salience,
 * and emits a TriggerStorylet event with all highest-salience candidates.
 * Tie-breaking is done using the seeded RNG inside the applyEvent fold.
 */
export function storyletSystem(storylets: ReadonlyMap<StoryletId, Storylet>): System {
  return (world) => {
    // 1. Filter to storylets whose preconditions hold
    const active: Storylet[] = [];
    for (const storylet of storylets.values()) {
      if (evaluateAll(world, storylet.preconditions)) {
        active.push(storylet);
      }
    }

    if (active.length === 0) {
      return [];
    }

    // 2. Rank by salience: find the maximum salience
    let maxSalience = -Infinity;
    for (const storylet of active) {
      if (storylet.salience > maxSalience) {
        maxSalience = storylet.salience;
      }
    }

    // 3. Collect candidates sharing the maximum salience
    const candidates = active.filter((s) => s.salience === maxSalience);

    // 4. Emit TriggerStorylet event with the candidates
    return [{ type: "TriggerStorylet", candidates }];
  };
}
