import type { Quest, QuestId } from "@codex/content-schema";
import { ItemId } from "@codex/content-schema";
import type { System } from "../tick";
import type { GameEvent } from "../events/event";
import { evaluateAll } from "../conditions/conditions";
import { effectsToEvents } from "../events/effects";

/**
 * The quest runtime (T-08, WORLD_STATE.md §2). A pure system that reads `World` + the quest
 * registry and emits events to: offer/activate quests, advance ordered objectives, complete
 * a branch atomically and idempotently (branch onComplete → quest onAnyComplete → rewards),
 * and foreclose failed non-retryable branches (a quest fails only when all branches close).
 * Progression is event-driven and naturally multi-tick: one objective resolves per tick.
 */
const CREDITS_ITEM = ItemId.parse("item.credits");

export function objectiveKey(branchId: string, index: number): string {
  return `${branchId}#${index}`;
}

function mark(questId: QuestId, key: string, done: boolean): GameEvent {
  return { type: "MarkObjective", questId, objectiveKey: key, done, failed: false };
}

function rewardEvents(rewards: Quest["rewards"]): GameEvent[] {
  const events: GameEvent[] = [];
  if (rewards.credits > 0) {
    events.push({ type: "GiveItem", itemId: CREDITS_ITEM, count: rewards.credits });
  }
  for (const item of rewards.items) {
    events.push({ type: "GiveItem", itemId: item.itemId, count: item.count });
  }
  for (const rep of rewards.reputation) {
    events.push({ type: "AdjustReputation", factionId: rep.factionId, delta: rep.delta });
  }
  return events;
}

/** §2 rule 3: branch onComplete → quest onAnyComplete → rewards, in this order, exactly once. */
function completionEvents(quest: Quest, branch: Quest["branches"][number]): GameEvent[] {
  const appliedEffectIds = [
    ...branch.onComplete.map((_, i) => `${branch.id}:onComplete:${i}`),
    ...quest.onAnyComplete.map((_, i) => `onAnyComplete:${i}`),
  ];
  return [
    { type: "CompleteQuestBranch", questId: quest.id, branchId: branch.id, appliedEffectIds },
    ...effectsToEvents(branch.onComplete),
    ...effectsToEvents(quest.onAnyComplete),
    ...rewardEvents(quest.rewards),
  ];
}

export function questSystem(quests: ReadonlyMap<QuestId, Quest>): System {
  return (world) => {
    const events: GameEvent[] = [];

    for (const quest of quests.values()) {
      const rt = world.quests[quest.id];

      if (!rt || rt.status === "unoffered") {
        if (evaluateAll(world, quest.offerWhen)) {
          events.push({
            type: "ActivateQuest",
            questId: quest.id,
            branchIds: quest.branches.map((b) => b.id),
          });
        }
        continue;
      }
      if (rt.status !== "active") continue;

      // Completion wins: if any active branch has all objectives done, complete it.
      const completing = quest.branches.find(
        (b) =>
          rt.activeBranchIds.includes(b.id) &&
          b.objectives.every((_, i) => rt.objectiveProgress[objectiveKey(b.id, i)]?.done),
      );
      if (completing) {
        events.push(...completionEvents(quest, completing));
        continue;
      }

      // Otherwise advance (or foreclose) each active branch's current objective.
      for (const branchId of rt.activeBranchIds) {
        const branch = quest.branches.find((b) => b.id === branchId);
        if (!branch) continue;

        let i = 0;
        while (i < branch.objectives.length && rt.objectiveProgress[objectiveKey(branchId, i)]?.done) {
          i++;
        }
        if (i >= branch.objectives.length) continue;

        const key = objectiveKey(branchId, i);
        const progress = rt.objectiveProgress[key];
        const objective = branch.objectives[i]!;
        const retryable = objective.kind === "skill_check" && objective.retryable;
        if (progress?.failed && !retryable) {
          events.push({ type: "ForecloseBranch", questId: quest.id, branchId });
          continue;
        }

        switch (objective.kind) {
          case "reach":
            if (world.locationId === objective.locationId) events.push(mark(quest.id, key, true));
            break;
          case "retrieve":
            if ((world.inventory[objective.itemId] ?? 0) >= objective.count) {
              events.push(mark(quest.id, key, true));
            }
            break;
          case "defeat":
            if (Object.values(world.entities).some((e) => e.defId === objective.npcId && !e.alive)) {
              events.push(mark(quest.id, key, true));
            }
            break;
          case "set_flag":
            if (world.flags[objective.flag] === objective.to) events.push(mark(quest.id, key, true));
            break;
          case "skill_check":
            if (!progress || progress.attempts === 0) {
              events.push({
                type: "ResolveSkillCheck",
                questId: quest.id,
                objectiveKey: key,
                skill: objective.skill,
                dc: objective.dc,
                onFail: objective.onFail,
              });
            }
            break;
          case "talk_to":
            // Completed via a dialogue flag once narrative (T-07) lands; unused by the slice.
            break;
        }
      }
    }

    return events;
  };
}
