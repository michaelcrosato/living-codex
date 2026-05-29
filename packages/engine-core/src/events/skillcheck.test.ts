import { describe, it, expect } from "vitest";
import type { Effect } from "@codex/content-schema";
import { FlagId, LocationId, QuestId } from "@codex/content-schema";
import { createWorld, type World, type QuestRuntimeState } from "../state/world";
import { applyEvent } from "./apply";
import { hash } from "../state/snapshot";
import { createLog, appendEvent, replay } from "./log";
import type { ContentFingerprint } from "@codex/content-schema";
import type { GameEvent } from "./event";

const START = LocationId.parse("location.start");
const QUEST = QuestId.parse("quest.the_warehouse");
const SUSPICIOUS = FlagId.parse("flag.guard_suspicious");
const FP: ContentFingerprint = { packs: {}, registriesHash: "x" };

function worldWithActiveQuest(): World {
  const w = createWorld({ seed: "ashfall", startLocationId: START });
  const quest: QuestRuntimeState = {
    status: "active",
    activeBranchIds: ["talk"],
    objectiveProgress: {},
    appliedEffectIds: [],
  };
  return { ...w, quests: { ...w.quests, [QUEST]: quest } };
}

const onFail: Effect[] = [{ kind: "set_flag", flag: SUSPICIOUS, to: true }];

function check(dc: number): GameEvent {
  return { type: "ResolveSkillCheck", questId: QUEST, objectiveKey: "talk#1", skill: "persuade", dc, onFail };
}

describe("ResolveSkillCheck (deterministic, replay-stable)", () => {
  it("is deterministic under a fixed seed", () => {
    const w = worldWithActiveQuest();
    const a = applyEvent(w, check(12));
    const b = applyEvent(w, check(12));
    expect(hash(a)).toBe(hash(b));
  });

  it("an impossible-to-fail check (dc 1) marks the objective done", () => {
    const w = applyEvent(worldWithActiveQuest(), check(1));
    expect(w.quests[QUEST]?.objectiveProgress["talk#1"]).toEqual({
      done: true,
      failed: false,
      attempts: 1,
    });
    expect(w.flags[SUSPICIOUS]).toBeUndefined();
  });

  it("an impossible-to-pass check (dc 30, skill 0) fails and applies onFail effects", () => {
    const w = applyEvent(worldWithActiveQuest(), check(30));
    expect(w.quests[QUEST]?.objectiveProgress["talk#1"]).toMatchObject({ done: false, failed: true });
    expect(w.flags[SUSPICIOUS]).toBe(true);
  });

  it("condition modifiers feed the roll math (what you learned in the bar matters)", () => {
    // dc 21 is unreachable with skill 0 (max roll 20). A +25 conditionMod makes it certain.
    const base = worldWithActiveQuest();
    expect(applyEvent(base, check(21)).quests[QUEST]?.objectiveProgress["talk#1"]?.failed).toBe(true);

    const buffed: World = {
      ...base,
      player: { ...base.player, conditionMods: { ...base.player.conditionMods, persuade: 25 } },
    };
    expect(applyEvent(buffed, check(21)).quests[QUEST]?.objectiveProgress["talk#1"]?.done).toBe(true);
  });

  it("advances rngState (the roll consumes the single RNG)", () => {
    const w = worldWithActiveQuest();
    const after = applyEvent(w, check(12));
    expect(after.rngState).not.toBe(w.rngState);
  });

  it("replays to an identical world hash (capture, don't recompute)", () => {
    const initial = worldWithActiveQuest();
    const live = applyEvent(initial, check(12));

    const log = createLog("ashfall", FP);
    appendEvent(log, 0, check(12));

    // a freshly-reconstructed identical initial world replays to the same state
    const replayed = replay(worldWithActiveQuest(), log);
    expect(hash(replayed)).toBe(hash(live));
  });
});
