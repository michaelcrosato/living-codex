import type { Storylet, StoryletId } from "@codex/content-schema";
import type { System } from "../tick";
import type { World } from "../state/world";
import { evaluateAll } from "../conditions/conditions";

/** A faction the player is "rising with" (reputation ≥ this) becomes a salience focus (SPEC-32). */
const FOCUS_THRESHOLD = 10;
/** Cap the waypoint bonus so a many-tagged storylet can't dominate authored base salience. */
const MAX_WAYPOINT_BONUS = 3;

/**
 * Drama-manager waypoint bonus (SPEC-32): a PURE, integer, World-derived nudge to a storylet's
 * salience, surfacing reactive flavor aligned with the player's current trajectory (the factions
 * they're rising with). Convention: tag a reactive storylet with a faction id to make it rise when
 * the player is aligned with that faction. `"main"`-tagged storylets are NEVER steered (main plot
 * stays gated behind explicit quest flags, never salience). Deterministic ⇒ replay-safe.
 */
export function waypointBonus(world: World, storylet: Storylet): number {
  if (storylet.tags.includes("main")) return 0;
  const reputation = world.reputation as Record<string, number>;
  let bonus = 0;
  for (const tag of storylet.tags) {
    if ((reputation[tag] ?? 0) >= FOCUS_THRESHOLD) {
      bonus++;
      if (bonus >= MAX_WAYPOINT_BONUS) break;
    }
  }
  return bonus;
}

/**
 * The storylet system (SPEC-11 + SPEC-32 waypoint steering).
 * Filters all loaded storylets by their preconditions, ranks by EFFECTIVE salience
 * (`base + waypointBonus`), and emits a TriggerStorylet event with all highest-ranked candidates.
 * Tie-breaking is done using the seeded RNG inside the applyEvent fold. With no aligned faction the
 * bonus is 0 everywhere, so behavior is identical to the SPEC-11 baseline.
 */
export function storyletSystem(storylets: ReadonlyMap<StoryletId, Storylet>): System {
  return (world) => {
    // 1. Filter to storylets whose preconditions hold; compute each one's effective salience.
    const active: { storylet: Storylet; effective: number }[] = [];
    for (const storylet of storylets.values()) {
      if (evaluateAll(world, storylet.preconditions)) {
        active.push({ storylet, effective: storylet.salience + waypointBonus(world, storylet) });
      }
    }

    if (active.length === 0) {
      return [];
    }

    // 2. Rank by effective salience: find the maximum.
    let maxEffective = -Infinity;
    for (const a of active) {
      if (a.effective > maxEffective) {
        maxEffective = a.effective;
      }
    }

    // 3. Collect candidates sharing the maximum effective salience (insertion order preserved).
    const candidates = active.filter((a) => a.effective === maxEffective).map((a) => a.storylet);

    // 4. Emit TriggerStorylet event with the candidates (tie broken by seeded RNG in the fold).
    return [{ type: "TriggerStorylet", candidates }];
  };
}
