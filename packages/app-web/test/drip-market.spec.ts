import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import {
  NpcId,
  QuestId,
  FlagId,
  FactionId,
  LocationId,
  DialogueId,
  type Storylet,
} from "@codex/content-schema";
import {
  createWorld,
  applyEvent,
  applyEvents,
  questSystem,
  evaluateAll,
  hash,
  replay,
  storyletSystem,
} from "@codex/engine-core";
import { InkNarrative } from "@codex/narrative-ink";
import { GameSession } from "../src/session";

/**
 * SPEC-33 — the hand-authored Drip Market pack loads through the IDENTICAL content-loader path as
 * every other pack, exercises the SPEC-23 `skill_at_least` passive check in real content (a
 * force-gated exit), plays its 3-solution quest end-to-end through the real engine, and fires a
 * fire-once storylet — with zero engine special-casing.
 */
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8"));
const opening = read("content/core/pack.opening/pack.json");
const drip = read("content/core/pack.drip_market/pack.json");

// loaded together through the SAME loadPacks (drip_market dependsOn pack.opening).
const { registries, fingerprint } = loadPacks([drip, opening]);

const QID = QuestId.parse("quest.market_debt");
const MARKET = LocationId.parse("location.drip_market");
const SYNDICATE = FactionId.parse("faction.ashfall_syndicate");
const MET_MARROW = FlagId.parse("flag.met_marrow");
const ENFORCER_DLG = DialogueId.parse("dialogue.drip_enforcer");

describe("Drip Market pack: same-path load + play (SPEC-33)", () => {
  it("shares one registry with the existing content", () => {
    expect(registries.npcs.has(NpcId.parse("npc.drip_vendor"))).toBe(true);
    expect(registries.npcs.has(NpcId.parse("npc.drip_enforcer"))).toBe(true);
    expect(registries.npcs.has(NpcId.parse("npc.drip_informant"))).toBe(true);
    expect(registries.npcs.has(NpcId.parse("npc.varga"))).toBe(true); // pack.opening
    expect(registries.locations.has(MARKET)).toBe(true);
    // a 3-solution quest (verified solvable by content:verify)
    expect(registries.quests.get(QID)?.branches.map((b) => b.id)).toEqual([
      "settle_talk",
      "settle_muscle",
      "settle_sneak",
    ]);
  });

  it("the force-gated exit is a real skill_at_least passive check (SPEC-23 in content)", () => {
    const gatedExit = registries.locations.get(MARKET)?.exits[1];
    expect(gatedExit?.toLocationId).toBe("location.drip_backroom");
    expect(gatedExit?.requires.length).toBe(1);
    const weak = createWorld({ seed: "x", startLocationId: MARKET, skills: { force: 2 } });
    const strong = createWorld({ seed: "x", startLocationId: MARKET, skills: { force: 3 } });
    expect(evaluateAll(weak, gatedExit!.requires)).toBe(false); // force 2 < 3 → locked
    expect(evaluateAll(strong, gatedExit!.requires)).toBe(true); // force 3 ≥ 3 → open
  });

  it("the quest plays end-to-end: talk_to → branch completes via the real engine", () => {
    let w = createWorld({ seed: "drip", startLocationId: MARKET, skills: { persuade: 6 } });
    w = applyEvent(w, { type: "SetFlag", flag: MET_MARROW, to: true }); // offerWhen
    // "talk the collector down" = engaging the enforcer's dialogue (the talk_to signal)
    w = applyEvent(w, { type: "DialogueAdvanced", dialogueId: ENFORCER_DLG, inkState: "{}", flags: {} });

    const attempt = [{ type: "Attempt" as const, questId: QID, branchId: "settle_talk" }];
    for (let t = 0; t < 8 && w.quests[QID]?.status !== "completed"; t++) {
      w = applyEvents(w, questSystem(registries.quests, attempt, registries.npcs)(w, 0));
    }

    expect(w.quests[QID]?.completedBranchId).toBe("settle_talk");
    expect(w.flags[FlagId.parse("flag.market_debt_resolved")]).toBe(true); // onAnyComplete
    expect(w.reputation[SYNDICATE]).toBe(10); // settle_talk onComplete

    // a fire-once aftermath storylet becomes eligible once the quest is done...
    const triggered = (cands: Storylet[] | undefined, id: string): boolean =>
      (cands ?? []).some((s) => (s.id as string) === id);
    const ev = storyletSystem(registries.storylets)(w, 0)[0];
    const cands = ev && ev.type === "TriggerStorylet" ? ev.candidates : undefined;
    expect(triggered(cands, "storylet.drip_settled")).toBe(true);
  });

  it("plays through a real GameSession at the market and replays identically", () => {
    const opts = {
      seed: "drip-session",
      startLocationId: MARKET,
      startPos: { x: 400, y: 300 },
      skills: { persuade: 3, sneak: 3, force: 3, tech: 1 },
    };
    const session = new GameSession(registries, fingerprint, new InkNarrative(), opts);
    for (const dir of [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]) {
      session.step([{ type: "Move", dir }]);
    }
    session.step([{ type: "Interact" }]);
    const replayed = replay(createWorld(opts), session.log, { against: fingerprint });
    expect(hash(replayed)).toBe(hash(session.world)); // determinism holds with the new pack loaded
  });
});
