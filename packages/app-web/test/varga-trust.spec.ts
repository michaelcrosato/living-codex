import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { QuestId, FactionId, FlagId, DialogueId, LocationId } from "@codex/content-schema";
import {
  createWorld,
  applyEvent,
  applyEvents,
  questSystem,
  type World,
  type GameEvent,
} from "@codex/engine-core";
import { InkNarrative } from "@codex/narrative-ink";
import { GameSession } from "../src/session";
import type { Storylet } from "@codex/content-schema";

/**
 * SPEC-64 — the reputation-gated Varga follow-up quest. The loyalty thread accumulates `varga_crew`
 * standing; `quest.varga_trust` is the first quest to gate its offer on `reputation_at_least` — it must
 * NOT offer below the threshold and MUST offer at/above it (proven via the engine's own ActivateQuest
 * path), and a branch completes end-to-end with its consequences.
 */
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8"));
const opening = read("content/core/pack.opening/pack.json");
const vargaTrust = read("content/core/pack.varga_trust/pack.json");
const { registries } = loadPacks([vargaTrust, opening]);

const QID = QuestId.parse("quest.varga_trust");
const VARGA_CREW = FactionId.parse("faction.varga_crew");
const DISTRICT = LocationId.parse("location.ashfall_district");
const VARGA_DLG = DialogueId.parse("dialogue.varga_intro");

const withRep = (delta: number): World => {
  let w = createWorld({
    seed: "trust",
    startLocationId: DISTRICT,
    skills: { sneak: 20, persuade: 20 },
  });
  if (delta !== 0) w = applyEvent(w, { type: "AdjustReputation", factionId: VARGA_CREW, delta });
  return w;
};
const offered = (w: World): boolean =>
  questSystem(registries.quests, [])(w, 0).some(
    (e) => e.type === "ActivateQuest" && e.questId === QID,
  );

describe("varga-trust reputation-gated quest (SPEC-64)", () => {
  it("does NOT offer below varga_crew standing 15, but DOES at/above it", () => {
    expect(offered(withRep(0))).toBe(false); // no standing
    expect(offered(withRep(14))).toBe(false); // just under the gate
    expect(offered(withRep(15))).toBe(true); // exactly at the gate
    expect(offered(withRep(25))).toBe(true); // well above
  });

  it("a branch completes end-to-end through the real engine with its consequences", () => {
    let w = withRep(15);
    // talk_to Varga = engaging her dialogue (captured into world.dialogue — the talk_to signal)
    w = applyEvent(w, {
      type: "DialogueAdvanced",
      dialogueId: VARGA_DLG,
      inkState: "{}",
      flags: {},
    });
    // run_it also needs reach(the_drip) — reach checks world.locationId (quests.ts)
    w = applyEvent(w, {
      type: "EnterLocation",
      locationId: LocationId.parse("location.the_drip"),
      spawnAt: { x: 50, y: 50 },
    });

    const attempt = [{ type: "Attempt" as const, questId: QID, branchId: "run_it" }];
    for (let t = 0; t < 10 && w.quests[QID]?.status !== "completed"; t++) {
      w = applyEvents(w, questSystem(registries.quests, attempt, registries.npcs)(w, 0));
    }

    expect(w.quests[QID]?.completedBranchId).toBe("run_it");
    expect(w.flags[FlagId.parse("flag.varga_inner_circle")]).toBe(true); // onComplete
    expect(w.flags[FlagId.parse("flag.varga_trust_resolved")]).toBe(true); // onAnyComplete
    expect(w.reputation[VARGA_CREW]).toBe(20); // 15 + 5 (onComplete bonus)
  });
});

/**
 * SPEC-93 � the convergence pair's other half: the player who stayed FULLY Varga's (inner circle + refused
 * Kestrel + never joined the Syndicate) gets storylet.fully_varga, the mirror of SPEC-92's fully_syndicate.
 */
describe("varga convergence storylet (SPEC-93)", () => {
  const opening2 = JSON.parse(
    readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
  );
  const vargaTrust = JSON.parse(
    readFileSync(resolve(process.cwd(), "content/core/pack.varga_trust/pack.json"), "utf8"),
  );
  const trig = (evs: readonly GameEvent[]): Storylet[] =>
    evs.find(
      (e): e is Extract<GameEvent, { type: "TriggerStorylet" }> => e.type === "TriggerStorylet",
    )?.candidates ?? [];
  const has = (evs: readonly GameEvent[]): boolean =>
    trig(evs).some((s) => (s.id as string) === "storylet.fully_varga");
  const sess = (flags: string[]) => {
    const { registries: r, fingerprint } = loadPacks([opening2, vargaTrust]);
    return new GameSession(r, fingerprint, new InkNarrative(), {
      seed: "fv",
      startLocationId: DISTRICT,
      startPos: { x: 50, y: 50 },
      seedEvents: flags.map((f) => ({ type: "SetFlag", flag: FlagId.parse(f), to: true })),
    });
  };

  it("fires once for the fully-loyal player; not if they also joined the Syndicate", () => {
    const loyal = sess(["flag.varga_inner_circle", "flag.refused_kestrel"]);
    expect(has(loyal.step([]))).toBe(true);
    expect(has(loyal.step([]))).toBe(false); // fire-once
    const turncoat = sess([
      "flag.varga_inner_circle",
      "flag.refused_kestrel",
      "flag.syndicate_made_member",
    ]);
    expect(has(turncoat.step([]))).toBe(false); // excluded � they took the Syndicate's coin
  });
});
