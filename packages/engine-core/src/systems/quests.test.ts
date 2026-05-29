import { describe, it, expect } from "vitest";
import { Quest, QuestId, LocationId, FlagId, FactionId, ItemId } from "@codex/content-schema";
import { createWorld, type World, type Entity, type CreateWorldOptions } from "../state/world";
import { applyEvent, applyEvents } from "../events/apply";
import type { InputEvent } from "../events/event";
import { questSystem } from "./quests";

const START = LocationId.parse("location.start");
const MET = FlagId.parse("flag.met_varga");
const PEACE = FlagId.parse("flag.entered_peacefully");
const HAS_DRIVE = FlagId.parse("flag.has_drive");
const DRIVE = ItemId.parse("item.encrypted_drive");
const CREDITS = ItemId.parse("item.credits");
const VARGA_CREW = FactionId.parse("faction.varga_crew");
const SYNDICATE = FactionId.parse("faction.ashfall_syndicate");
const QID = QuestId.parse("quest.the_warehouse");

/** A two-branch quest: talk (a persuade check) or force (defeat the guard). */
const quest = Quest.parse({
  id: "quest.the_warehouse",
  title: "What's in the Warehouse",
  summary: "Get the drive.",
  offerWhen: [{ kind: "flag_is", flag: "flag.met_varga", equals: true }],
  branches: [
    {
      id: "talk",
      label: "Talk",
      objectives: [
        {
          kind: "skill_check",
          skill: "persuade",
          dc: 12,
          onFail: [{ kind: "set_flag", flag: "flag.guard_suspicious", to: true }],
        },
      ],
      onComplete: [{ kind: "set_flag", flag: "flag.entered_peacefully", to: true }],
    },
    {
      id: "force",
      label: "Force",
      objectives: [{ kind: "defeat", npcId: "npc.guard" }],
      onComplete: [{ kind: "adjust_reputation", factionId: "faction.ashfall_syndicate", delta: -15 }],
    },
  ],
  onAnyComplete: [
    { kind: "give_item", itemId: "item.encrypted_drive", count: 1 },
    { kind: "set_flag", flag: "flag.has_drive", to: true },
  ],
  rewards: { credits: 200, reputation: [{ factionId: "faction.varga_crew", delta: 10 }] },
});

const registry = new Map([[QID, quest]]);

function world(opts?: Partial<CreateWorldOptions>): World {
  return createWorld({ seed: "ashfall", startLocationId: START, ...opts });
}

/** Attempt the pursued branch's current objective only when it's a skill_check (S1.3). */
function attemptFor(w: World, quests: ReadonlyMap<typeof QID, Quest>, branchId: string): InputEvent[] {
  const rt = w.quests[QID];
  if (!rt || rt.status !== "active") return [];
  const branch = quests.get(QID)?.branches.find((b) => b.id === branchId);
  if (!branch) return [];
  let i = 0;
  while (i < branch.objectives.length && rt.objectiveProgress[`${branchId}#${i}`]?.done) i++;
  return branch.objectives[i]?.kind === "skill_check"
    ? [{ type: "Attempt", questId: QID, branchId }]
    : [];
}

function drive(
  initial: World,
  quests: ReadonlyMap<typeof QID, Quest>,
  branchId: string,
  maxTicks = 12,
): World {
  let w = initial;
  for (let t = 0; t < maxTicks; t++) {
    const events = questSystem(quests, attemptFor(w, quests, branchId))(w, 0);
    if (events.length === 0) break;
    w = applyEvents(w, events);
  }
  return w;
}

describe("quest runtime", () => {
  it("offers/activates a quest when offerWhen holds", () => {
    const sys = questSystem(registry);
    expect(sys(world(), 0)).toHaveLength(0); // not met yet
    const met = applyEvent(world(), { type: "SetFlag", flag: MET, to: true });
    const evs = sys(met, 0);
    expect(evs).toEqual([
      { type: "ActivateQuest", questId: QID, branchIds: ["talk", "force"] },
    ]);
  });

  it("completes the talk branch atomically (onComplete → onAnyComplete → rewards)", () => {
    const start = applyEvent(world({ skills: { persuade: 20 } }), { type: "SetFlag", flag: MET, to: true });
    const final = drive(start, registry, "talk");
    const rt = final.quests[QID]!;
    expect(rt.status).toBe("completed");
    expect(rt.completedBranchId).toBe("talk");
    expect(final.flags[PEACE]).toBe(true); // branch onComplete
    expect(final.flags[HAS_DRIVE]).toBe(true); // quest onAnyComplete
    expect(final.inventory[DRIVE]).toBe(1);
    expect(final.inventory[CREDITS]).toBe(200); // rewards
    expect(final.reputation[VARGA_CREW]).toBe(10);
  });

  it("completes via force (defeat) with the distinct reputation consequence", () => {
    let start = applyEvent(world({ skills: { persuade: 0 } }), { type: "SetFlag", flag: MET, to: true });
    const guard: Entity = {
      id: "entity.guard",
      defId: "npc.guard",
      locationId: START,
      pos: { x: 0, y: 0 },
      hp: 1,
      alive: true,
    };
    start = applyEvent(start, { type: "SpawnEntity", entity: guard });
    start = applyEvent(start, { type: "SetEntityHp", entityId: "entity.guard", hp: 0, alive: false });
    // persuade 0, but pursuing "force" never attempts the talk check, so force wins deterministically
    const final = drive(start, registry, "force");
    expect(final.quests[QID]?.completedBranchId).toBe("force");
    expect(final.reputation[SYNDICATE]).toBe(-15); // the cost of force
    expect(final.flags[PEACE]).toBeUndefined(); // talk's consequence did NOT happen
    expect(final.flags[HAS_DRIVE]).toBe(true);
  });

  it("forecloses a failed non-retryable branch; quest fails when all branches close", () => {
    // single-branch quest, persuade 0 vs dc 12 -> always fails -> foreclosed -> failed
    const solo = Quest.parse({ ...quest, branches: [quest.branches[0]] });
    const soloMap = new Map([[QID, solo]]);
    const start = applyEvent(world({ skills: { persuade: 0 } }), { type: "SetFlag", flag: MET, to: true });
    const final = drive(start, soloMap, "talk");
    expect(final.quests[QID]?.status).toBe("failed");
    expect(final.flags[FlagId.parse("flag.guard_suspicious")]).toBe(true); // onFail fired
  });

  it("is idempotent: a completed quest emits nothing and rewards never double-apply", () => {
    const start = applyEvent(world({ skills: { persuade: 20 } }), { type: "SetFlag", flag: MET, to: true });
    const final = drive(start, registry, "talk");
    expect(questSystem(registry)(final, 0)).toHaveLength(0);
    expect(final.inventory[CREDITS]).toBe(200);
  });
});
