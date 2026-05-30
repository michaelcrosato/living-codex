import { describe, it, expect } from "vitest";
import { FactionId, ItemId, FlagId, LocationId, QuestId } from "@codex/content-schema";
import type { Storylet } from "@codex/content-schema";
import { createWorld } from "../state/world";
import { applyEvent } from "./apply";

/** A storylet whose only effect grants one of `item`, so selection is observable via inventory. */
const grantStorylet = (id: string, item: string): Storylet =>
  ({
    id,
    preconditions: [],
    salience: 1,
    tags: [],
    content: { ambient: "…" },
    effects: [{ kind: "give_item", itemId: item, count: 1 }],
  }) as unknown as Storylet;

const START = LocationId.parse("location.start");
const world0 = () => createWorld({ seed: "seed", startLocationId: START });

describe("applyEvent (the chokepoint)", () => {
  it("clamps reputation to [-100, 100]", () => {
    const faction = FactionId.parse("faction.syndicate");
    let w = applyEvent(world0(), { type: "AdjustReputation", factionId: faction, delta: 250 });
    expect(w.reputation[faction]).toBe(100);
    w = applyEvent(w, { type: "AdjustReputation", factionId: faction, delta: -500 });
    expect(w.reputation[faction]).toBe(-100);
  });

  it("forbids driving inventory below zero", () => {
    const item = ItemId.parse("item.credits");
    const w = applyEvent(world0(), { type: "GiveItem", itemId: item, count: 5 });
    expect(w.inventory[item]).toBe(5);
    const w2 = applyEvent(w, { type: "GiveItem", itemId: item, count: -3 });
    expect(w2.inventory[item]).toBe(2);
    expect(() => applyEvent(w2, { type: "GiveItem", itemId: item, count: -10 })).toThrowError(
      /below zero/,
    );
  });

  it("modify_skill adjusts the player's condition modifiers", () => {
    const w = applyEvent(world0(), { type: "ModifySkill", skill: "persuade", delta: 2 });
    expect(w.player.conditionMods.persuade).toBe(2);
    expect(w.player.skills.persuade).toBe(0);
  });

  it("EnterLocation moves the player entity and sets the current location", () => {
    const dest = LocationId.parse("location.drip");
    const w = applyEvent(world0(), {
      type: "EnterLocation",
      locationId: dest,
      spawnAt: { x: 5, y: 9 },
    });
    expect(w.locationId).toBe(dest);
    expect(w.entities["entity.player"]?.locationId).toBe(dest);
    expect(w.entities["entity.player"]?.pos).toEqual({ x: 5, y: 9 });
  });

  it("OfferQuest / StartQuest are idempotent and never downgrade an in-progress quest", () => {
    const quest = QuestId.parse("quest.the_warehouse");
    let w = applyEvent(world0(), { type: "StartQuest", questId: quest });
    expect(w.quests[quest]?.status).toBe("active");
    w = applyEvent(w, { type: "OfferQuest", questId: quest });
    expect(w.quests[quest]?.status).toBe("active");
  });

  it("is pure — it never mutates the input world", () => {
    const before = world0();
    const snapshot = JSON.stringify(before);
    applyEvent(before, { type: "SetFlag", flag: FlagId.parse("flag.x"), to: true });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("GiveItem allows an inventory of exactly zero (only NEGATIVE is forbidden)", () => {
    const item = ItemId.parse("item.shiv");
    let w = applyEvent(world0(), { type: "GiveItem", itemId: item, count: 3 });
    w = applyEvent(w, { type: "GiveItem", itemId: item, count: -3 }); // → exactly 0, must not throw
    expect(w.inventory[item]).toBe(0);
  });

  it("ActivateQuest sets the active branches and is idempotent for an in-progress quest", () => {
    const quest = QuestId.parse("quest.market_debt");
    let w = applyEvent(world0(), { type: "ActivateQuest", questId: quest, branchIds: ["talk"] });
    expect(w.quests[quest]?.status).toBe("active");
    expect(w.quests[quest]?.activeBranchIds).toEqual(["talk"]);
    // re-activating an active quest must NOT reset its branches
    w = applyEvent(w, { type: "ActivateQuest", questId: quest, branchIds: ["muscle"] });
    expect(w.quests[quest]?.activeBranchIds).toEqual(["talk"]);
  });

  it("CompleteQuestBranch is atomic + idempotent (a completed quest never re-completes)", () => {
    const quest = QuestId.parse("quest.market_debt");
    let w = applyEvent(world0(), { type: "ActivateQuest", questId: quest, branchIds: ["talk"] });
    w = applyEvent(w, {
      type: "CompleteQuestBranch",
      questId: quest,
      branchId: "talk",
      appliedEffectIds: ["fx1"],
    });
    expect(w.quests[quest]?.status).toBe("completed");
    expect(w.quests[quest]?.completedBranchId).toBe("talk");
    expect(w.quests[quest]?.appliedEffectIds).toEqual(["fx1"]);
    // a second completion (different branch) must be ignored
    w = applyEvent(w, {
      type: "CompleteQuestBranch",
      questId: quest,
      branchId: "muscle",
      appliedEffectIds: ["fx2"],
    });
    expect(w.quests[quest]?.completedBranchId).toBe("talk");
  });

  it("ForecloseBranch removes a branch and fails the quest only when none remain", () => {
    const quest = QuestId.parse("quest.market_debt");
    let w = applyEvent(world0(), {
      type: "ActivateQuest",
      questId: quest,
      branchIds: ["talk", "muscle"],
    });
    w = applyEvent(w, { type: "ForecloseBranch", questId: quest, branchId: "talk" });
    expect(w.quests[quest]?.activeBranchIds).toEqual(["muscle"]);
    expect(w.quests[quest]?.status).toBe("active"); // one branch still open
    w = applyEvent(w, { type: "ForecloseBranch", questId: quest, branchId: "muscle" });
    expect(w.quests[quest]?.activeBranchIds).toEqual([]);
    expect(w.quests[quest]?.status).toBe("failed"); // last branch foreclosed → failed
  });

  it("ResolveAttack: the player's force adds to damage; a non-player attacker gets no bonus", () => {
    const base = createWorld({ seed: "atk", startLocationId: START, skills: { force: 5 } });
    const spawn = (id: string) =>
      ({ type: "SpawnEntity", entity: { id, defId: "npc.t", locationId: START, pos: { x: 0, y: 0 }, hp: 100, alive: true } }) as const;
    let w = applyEvent(base, spawn("entity.target"));
    w = applyEvent(w, spawn("entity.thug"));
    // Both attacks branch from the SAME rngState, so the d6 roll is identical — the only
    // difference is the attacker's force bonus (player +5 vs non-player +0).
    const dmg = (attackerEntityId: string): number => {
      const after = applyEvent(w, { type: "ResolveAttack", attackerEntityId, targetEntityId: "entity.target" });
      return 100 - (after.entities["entity.target"]?.hp ?? 0);
    };
    expect(dmg("entity.player") - dmg("entity.thug")).toBe(5);
  });

  it("BribeFaction shifts standing and spends credits only when affordable", () => {
    const faction = FactionId.parse("faction.syndicate");
    const credits = ItemId.parse("item.credits");
    let w = applyEvent(world0(), { type: "GiveItem", itemId: credits, count: 10 });
    w = applyEvent(w, { type: "BribeFaction", factionId: faction, cost: 6, standing: 20 });
    expect(w.reputation[faction]).toBe(20);
    expect(w.inventory[credits]).toBe(4);
    // cost 10 > remaining 4 → the bribe must be a no-op (no standing change, no spend)
    const w2 = applyEvent(w, { type: "BribeFaction", factionId: faction, cost: 10, standing: 20 });
    expect(w2.reputation[faction]).toBe(20);
    expect(w2.inventory[credits]).toBe(4);
  });

  it("TriggerStorylet with no candidates is a no-op", () => {
    const w0 = world0();
    expect(applyEvent(w0, { type: "TriggerStorylet", candidates: [] })).toEqual(w0);
  });

  it("TriggerStorylet with a single candidate selects it WITHOUT consuming randomness", () => {
    const w0 = world0();
    const gold = ItemId.parse("item.gold");
    const after = applyEvent(w0, {
      type: "TriggerStorylet",
      candidates: [grantStorylet("storylet.s1", gold)],
    });
    expect(after.inventory[gold]).toBe(1); // the lone storylet's effect applied
    expect(after.rngState).toBe(w0.rngState); // single-candidate path rolls no dice
  });

  it("TriggerStorylet with multiple candidates picks exactly one (seeded) and advances the RNG", () => {
    const w0 = world0();
    const gold = ItemId.parse("item.gold");
    const silver = ItemId.parse("item.silver");
    const after = applyEvent(w0, {
      type: "TriggerStorylet",
      candidates: [grantStorylet("storylet.s1", gold), grantStorylet("storylet.s2", silver)],
    });
    const g = after.inventory[gold] ?? 0;
    const s = after.inventory[silver] ?? 0;
    expect(g + s).toBe(1); // exactly one selected, deterministically
    expect(after.rngState).not.toBe(w0.rngState); // tie-break consumed randomness
  });
});
