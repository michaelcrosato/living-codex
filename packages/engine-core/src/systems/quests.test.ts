import { describe, it, expect } from "vitest";
import {
  Quest,
  QuestId,
  LocationId,
  FlagId,
  FactionId,
  ItemId,
  Npc,
  NpcId,
  DialogueId,
} from "@codex/content-schema";
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
      onComplete: [
        { kind: "adjust_reputation", factionId: "faction.ashfall_syndicate", delta: -15 },
      ],
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
function attemptFor(
  w: World,
  quests: ReadonlyMap<typeof QID, Quest>,
  branchId: string,
): InputEvent[] {
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
    expect(evs).toEqual([{ type: "ActivateQuest", questId: QID, branchIds: ["talk", "force"] }]);
  });

  it("completes the talk branch atomically (onComplete → onAnyComplete → rewards)", () => {
    const start = applyEvent(world({ skills: { persuade: 20 } }), {
      type: "SetFlag",
      flag: MET,
      to: true,
    });
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
    let start = applyEvent(world({ skills: { persuade: 0 } }), {
      type: "SetFlag",
      flag: MET,
      to: true,
    });
    const guard: Entity = {
      id: "entity.guard",
      defId: "npc.guard",
      locationId: START,
      pos: { x: 0, y: 0 },
      hp: 1,
      alive: true,
    };
    start = applyEvent(start, { type: "SpawnEntity", entity: guard });
    start = applyEvent(start, {
      type: "SetEntityHp",
      entityId: "entity.guard",
      hp: 0,
      alive: false,
    });
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
    const start = applyEvent(world({ skills: { persuade: 0 } }), {
      type: "SetFlag",
      flag: MET,
      to: true,
    });
    const final = drive(start, soloMap, "talk");
    expect(final.quests[QID]?.status).toBe("failed");
    expect(final.flags[FlagId.parse("flag.guard_suspicious")]).toBe(true); // onFail fired
  });

  it("is idempotent: a completed quest emits nothing and rewards never double-apply", () => {
    const start = applyEvent(world({ skills: { persuade: 20 } }), {
      type: "SetFlag",
      flag: MET,
      to: true,
    });
    const final = drive(start, registry, "talk");
    expect(questSystem(registry)(final, 0)).toHaveLength(0);
    expect(final.inventory[CREDITS]).toBe(200);
  });

  it("a multi-objective branch completes only when ALL objectives are done, in order (reach → retrieve)", () => {
    const HEIST = QuestId.parse("quest.heist");
    const HUB = LocationId.parse("location.hub");
    const GADGET = ItemId.parse("item.gadget");
    const multi = Quest.parse({
      id: "quest.heist",
      title: "Heist",
      summary: "Reach the hub, then grab two gadgets.",
      offerWhen: [], // vacuously true -> offered immediately
      branches: [
        {
          id: "do_it",
          label: "Do it",
          objectives: [
            { kind: "reach", locationId: "location.hub" },
            { kind: "retrieve", itemId: "item.gadget", count: 2 },
          ],
          onComplete: [{ kind: "set_flag", flag: "flag.heist_done", to: true }],
        },
      ],
      rewards: {},
    });
    const map = new Map([[HEIST, multi]]);

    let w = applyEvents(world(), questSystem(map)(world(), 0)); // ActivateQuest
    expect(w.quests[HEIST]?.status).toBe("active");

    // at START (not the hub), no gadgets -> neither objective resolves
    w = applyEvents(w, questSystem(map)(w, 0));
    expect(w.quests[HEIST]?.objectiveProgress["do_it#0"]?.done).toBeFalsy();

    // reach the hub: objective 0 done, but objective 1 (retrieve) is NOT -> branch must stay active
    w = applyEvent(w, { type: "EnterLocation", locationId: HUB, spawnAt: { x: 0, y: 0 } });
    w = applyEvents(w, questSystem(map)(w, 0));
    expect(w.quests[HEIST]?.objectiveProgress["do_it#0"]?.done).toBe(true);
    expect(w.quests[HEIST]?.objectiveProgress["do_it#1"]?.done).toBeFalsy();
    expect(w.quests[HEIST]?.status).toBe("active"); // 1/2 objectives must NOT complete the branch
    expect(w.flags[FlagId.parse("flag.heist_done")]).toBeUndefined();

    // exactly 1 gadget is still short of count:2 -> still not done (guards the >= count threshold)
    w = applyEvent(w, { type: "GiveItem", itemId: GADGET, count: 1 });
    w = applyEvents(w, questSystem(map)(w, 0));
    expect(w.quests[HEIST]?.objectiveProgress["do_it#1"]?.done).toBeFalsy();
    expect(w.quests[HEIST]?.status).toBe("active");

    // the 2nd gadget completes retrieve; the next tick completes the branch (all objectives done)
    w = applyEvent(w, { type: "GiveItem", itemId: GADGET, count: 1 });
    for (let t = 0; t < 4 && w.quests[HEIST]?.status === "active"; t++) {
      const evs = questSystem(map)(w, 0);
      if (evs.length === 0) break;
      w = applyEvents(w, evs);
    }
    expect(w.quests[HEIST]?.status).toBe("completed");
    expect(w.quests[HEIST]?.completedBranchId).toBe("do_it");
    expect(w.flags[FlagId.parse("flag.heist_done")]).toBe(true);
  });

  it("completes a talk_to objective once the NPC's dialogue has been engaged (SPEC-02)", () => {
    const MEETQ = QuestId.parse("quest.meet");
    const VARGA = NpcId.parse("npc.varga");
    const DLG = DialogueId.parse("dialogue.varga_intro");
    const talkQuest = Quest.parse({
      id: "quest.meet",
      title: "Meet the Fixer",
      summary: "Find Varga and talk.",
      offerWhen: [{ kind: "flag_is", flag: "flag.met_varga", equals: true }],
      branches: [
        { id: "talk", label: "Talk", objectives: [{ kind: "talk_to", npcId: "npc.varga" }] },
      ],
      rewards: {},
    });
    const talkMap = new Map([[MEETQ, talkQuest]]);
    const varga = Npc.parse({
      id: "npc.varga",
      name: "Varga",
      appearance: { bodyColor: "#ccc", accentColor: "#0ff", silhouette: "cloaked" },
      bio: {
        role: "fixer",
        backstory: "owes the syndicate",
        wants: "a drive",
        fears: "exposure",
        voice: "clipped",
      },
      dialogueId: "dialogue.varga_intro",
    });
    const npcs = new Map([[VARGA, varga]]);

    // activate, then confirm talk_to does NOT resolve before any conversation
    let w = applyEvent(world(), { type: "SetFlag", flag: MET, to: true });
    w = applyEvents(w, questSystem(talkMap, [], npcs)(w, 0));
    expect(w.quests[MEETQ]?.status).toBe("active");
    expect(questSystem(talkMap, [], npcs)(w, 0)).toHaveLength(0);

    // engage the dialogue — captured into world.dialogue (replay-safe)
    w = applyEvent(w, { type: "DialogueAdvanced", dialogueId: DLG, inkState: "{}", flags: {} });

    // defensive: without the npc registry, talk_to can't resolve the dialogue id
    expect(questSystem(talkMap, [])(w, 0)).toHaveLength(0);

    // with the registry, talk_to marks done, then the single-objective branch completes
    w = applyEvents(w, questSystem(talkMap, [], npcs)(w, 0));
    expect(w.quests[MEETQ]?.objectiveProgress["talk#0"]?.done).toBe(true);
    w = applyEvents(w, questSystem(talkMap, [], npcs)(w, 0));
    expect(w.quests[MEETQ]?.status).toBe("completed");
    expect(w.quests[MEETQ]?.completedBranchId).toBe("talk");
  });
});
