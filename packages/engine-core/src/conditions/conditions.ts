import type { Condition } from "@codex/content-schema";
import type { World } from "../state/world";

/**
 * The condition evaluator (SCHEMA.md §7): pure, total, and exhaustive over the Condition
 * union. Powers quest gating, exit locks, and NPC reactions. Adding a new condition kind is
 * one schema entry + one switch arm + one test (SCHEMA.md §7).
 */
export function evaluate(world: World, condition: Condition): boolean {
  switch (condition.kind) {
    case "flag_is":
      return world.flags[condition.flag] === condition.equals;
    case "reputation_at_least":
      return (world.reputation[condition.factionId] ?? 0) >= condition.value;
    case "has_item":
      return (world.inventory[condition.itemId] ?? 0) >= condition.count;
    case "quest_completed":
      return world.quests[condition.questId]?.status === "completed";
    case "credits_at_least":
      return ((world.inventory as Record<string, number>)["item.credits"] ?? 0) >= condition.amount;
    case "not":
      return !evaluate(world, condition.of);
    case "all":
      return condition.of.every((c) => evaluate(world, c));
    case "any":
      return condition.of.some((c) => evaluate(world, c));
    default: {
      const exhaustive: never = condition;
      throw new Error(`evaluate: unhandled condition ${JSON.stringify(exhaustive)}`);
    }
  }
}

/** Conjunction over a list (offerWhen / exit.requires). An empty list is vacuously true. */
export function evaluateAll(world: World, conditions: readonly Condition[]): boolean {
  return conditions.every((c) => evaluate(world, c));
}
