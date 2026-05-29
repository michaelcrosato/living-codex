import type { System } from "../tick";
import type { GameEvent, InputEvent } from "../events/event";

/**
 * The bribe system (T-16): forwards a `Bribe` player input as a `BribeFaction` event. It stays
 * trivial because affordability + reputation bounds are enforced in applyEvent (the chokepoint).
 * Added end-to-end with the bribe_faction effect, the credits_at_least condition, and a content
 * pack — the showcase's "adding a mechanic is small and bounded" proof.
 */
export function bribeSystem(inputs: readonly InputEvent[]): System {
  return () => {
    const events: GameEvent[] = [];
    for (const input of inputs) {
      if (input.type === "Bribe") {
        events.push({
          type: "BribeFaction",
          factionId: input.factionId,
          cost: input.cost,
          standing: input.standing,
        });
      }
    }
    return events;
  };
}
