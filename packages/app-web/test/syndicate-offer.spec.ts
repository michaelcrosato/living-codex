import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { NpcId, FactionId, QuestId, FlagId, DialogueId, LocationId } from "@codex/content-schema";
import type { Storylet } from "@codex/content-schema";
import { InkNarrative } from "@codex/narrative-ink";
import {
  createWorld,
  applyEvent,
  applyEvents,
  questSystem,
  hash,
  replay,
  type GameEvent,
} from "@codex/engine-core";
import { GameSession, type GameSessionOptions } from "../src/session";

/**
 * SPEC-50 — the hand-curated "The City's Cut" pack (the Syndicate's offer) loads through the
 * IDENTICAL content-loader path as the hand-authored and pipeline-generated packs, gives the
 * Ashfall Syndicate an NPC face, and its branching quest plays end-to-end through the real engine.
 * The quest chains off the warehouse drive (`flag.has_drive`): it must NOT offer until the player
 * holds the drive, and MUST offer once they do — proven via the engine's own offer path (questSystem
 * emits ActivateQuest when offerWhen passes), with zero engine special-casing.
 */
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8"));
const opening = read("content/core/pack.opening/pack.json");
const patrons = read("content/generated/pack.the_drip_patrons/pack.json");
const syndicate = read("content/core/pack.syndicate_offer/pack.json");

// loaded together through the SAME loadPacks — order-independent (syndicate dependsOn pack.opening)
const { registries } = loadPacks([syndicate, patrons, opening]);

const QID = QuestId.parse("quest.syndicate_offer");
const BROKER = NpcId.parse("npc.syndicate_broker");
const SYNDICATE = FactionId.parse("faction.ashfall_syndicate");
const VARGA_CREW = FactionId.parse("faction.varga_crew");
const DLG = DialogueId.parse("dialogue.syndicate_broker");
const HAS_DRIVE = FlagId.parse("flag.has_drive");
const THE_DRIP = LocationId.parse("location.the_drip");

describe("syndicate-offer pack: same-path load + play (SPEC-50)", () => {
  it("shares one registry with hand-authored + pipeline-generated content", () => {
    expect(registries.npcs.has(BROKER)).toBe(true); // this pack (hand-curated)
    expect(registries.npcs.has(NpcId.parse("npc.varga"))).toBe(true); // pack.opening
    expect(registries.npcs.has(NpcId.parse("npc.the_archivist"))).toBe(true); // generated
    expect(registries.quests.has(QID)).toBe(true);
  });

  it("gives the Syndicate an NPC face whose cross-pack refs resolve in one integrity pass", () => {
    // the faction + home location it references both live in pack.opening
    expect(registries.factions.has(SYNDICATE)).toBe(true);
    expect(registries.npcs.get(BROKER)?.faction).toBe("faction.ashfall_syndicate");
    expect(registries.npcs.get(BROKER)?.homeLocationId).toBe("location.the_drip");
    expect(registries.locations.has(THE_DRIP)).toBe(true);
  });

  it("the broker's Ink dialogue plays through the identical narrative path", () => {
    const asset = registries.dialogues.get(DLG);
    expect(asset).toBeDefined();
    const session = new InkNarrative().load(asset!.compiled);
    expect(session.current().choices.length).toBe(3);
    session.choose(0);
    session.current(); // continue past the choice so the `~ set` runs
    expect(session.getVar("met_broker")).toBe(true);
  });

  it("does NOT offer without the drive, but DOES once flag.has_drive is set (engine offer path)", () => {
    const offered = (w: ReturnType<typeof createWorld>): boolean =>
      questSystem(registries.quests, [])(w, 0).some(
        (e) => e.type === "ActivateQuest" && e.questId === QID,
      );

    const noDrive = createWorld({ seed: "syndicate", startLocationId: THE_DRIP });
    expect(offered(noDrive)).toBe(false); // gated on flag.has_drive

    const withDrive = applyEvent(noDrive, { type: "SetFlag", flag: HAS_DRIVE, to: true });
    expect(offered(withDrive)).toBe(true); // chains off quest.the_warehouse
  });

  it("a branch completes end-to-end through the real engine and applies its consequences", () => {
    // skills high enough to pass the `sell` branch's persuade DC 12
    let w = createWorld({ seed: "syndicate", startLocationId: THE_DRIP, skills: { persuade: 20 } });
    w = applyEvent(w, { type: "SetFlag", flag: HAS_DRIVE, to: true });
    // talking to the broker = engaging her dialogue (captured into world.dialogue — the talk_to signal)
    w = applyEvent(w, { type: "DialogueAdvanced", dialogueId: DLG, inkState: "{}", flags: {} });

    const attempt = [{ type: "Attempt" as const, questId: QID, branchId: "sell" }];
    for (let t = 0; t < 8 && w.quests[QID]?.status !== "completed"; t++) {
      w = applyEvents(w, questSystem(registries.quests, attempt, registries.npcs)(w, 0));
    }

    expect(w.quests[QID]?.completedBranchId).toBe("sell");
    expect(w.flags[FlagId.parse("flag.sold_drive")]).toBe(true); // onComplete
    expect(w.flags[FlagId.parse("flag.syndicate_resolved")]).toBe(true); // onAnyComplete
    expect(w.reputation[SYNDICATE]).toBe(12); // selling the data earns Syndicate favor
    expect(w.reputation[VARGA_CREW]).toBe(-8); // ...at Varga's expense
  });
});

/**
 * SPEC-54 — the decrypt branch's consequence (flag.knows_syndicate_secret) pays off via a fire-once
 * salience storylet that surfaces through the REAL GameSession/tick path (storylet-barks pattern),
 * and the session still replays to an identical hash (storylet selection stayed deterministic).
 */
const DISTRICT = LocationId.parse("location.ashfall_district");
const triggerOf = (events: readonly GameEvent[]): Storylet[] | undefined =>
  events.find(
    (e): e is Extract<GameEvent, { type: "TriggerStorylet" }> => e.type === "TriggerStorylet",
  )?.candidates;
const hasStorylet = (cands: Storylet[] | undefined, id: string): boolean =>
  (cands ?? []).some((s) => (s.id as string) === id);

describe("syndicate decrypt payoff storylet (SPEC-54)", () => {
  it("fires once when the player knows the secret, then not again; replays identically", () => {
    const { registries: regs, fingerprint } = loadPacks([opening, syndicate]);
    const opts: GameSessionOptions = {
      seed: "secret",
      startLocationId: DISTRICT,
      startPos: { x: 50, y: 50 },
      seedEvents: [{ type: "SetFlag", flag: FlagId.parse("flag.knows_syndicate_secret"), to: true }],
    };
    const session = new GameSession(regs, fingerprint, new InkNarrative(), opts);

    // knows_syndicate_secret is set and the bark is unseen -> it is the eligible storylet.
    expect(hasStorylet(triggerOf(session.step([])), "storylet.knows_secret")).toBe(true);
    // fire-once: its effect set flag.bark_knows_secret_seen, which a precondition excludes -> no re-fire.
    expect(hasStorylet(triggerOf(session.step([])), "storylet.knows_secret")).toBe(false);

    const replayed = replay(createWorld(opts), session.log, { against: fingerprint });
    expect(hash(replayed)).toBe(hash(session.world));
  });
});

/**
 * SPEC-62 — the Archivist (a now-reachable Drip patron whose bio wants "the drive, and the one who
 * took it") is paid off by a fire-once storylet that fires once the player holds the drive AND has met
 * her. Proves the designed hook lands through the real GameSession path, and replay stays deterministic.
 */
describe("Archivist drive-payoff storylet (SPEC-62)", () => {
  it("fires once when the player holds the drive and has met the Archivist; replays identically", () => {
    const { registries: regs, fingerprint } = loadPacks([opening, syndicate]);
    const opts: GameSessionOptions = {
      seed: "archivist",
      startLocationId: DISTRICT,
      startPos: { x: 50, y: 50 },
      seedEvents: [
        { type: "SetFlag", flag: HAS_DRIVE, to: true },
        { type: "SetFlag", flag: FlagId.parse("flag.met_archivist"), to: true },
      ],
    };
    const session = new GameSession(regs, fingerprint, new InkNarrative(), opts);

    expect(hasStorylet(triggerOf(session.step([])), "storylet.archivist_knows")).toBe(true);
    expect(hasStorylet(triggerOf(session.step([])), "storylet.archivist_knows")).toBe(false); // fire-once

    const replayed = replay(createWorld(opts), session.log, { against: fingerprint });
    expect(hash(replayed)).toBe(hash(session.world));
  });

  it("does NOT fire if the player has the drive but never met the Archivist", () => {
    const { registries: regs, fingerprint } = loadPacks([opening, syndicate]);
    const opts: GameSessionOptions = {
      seed: "archivist2",
      startLocationId: DISTRICT,
      startPos: { x: 50, y: 50 },
      seedEvents: [{ type: "SetFlag", flag: HAS_DRIVE, to: true }], // no met_archivist
    };
    const session = new GameSession(regs, fingerprint, new InkNarrative(), opts);
    expect(hasStorylet(triggerOf(session.step([])), "storylet.archivist_knows")).toBe(false);
  });
});

/**
 * SPEC-63 — the dockhand's warehouse rumor (flag.heard_warehouse_rumor) lands as an actionable lead
 * BEFORE the warehouse is done (¬has_drive), and is gated off afterward. Fires once through the real
 * session path; replay stays deterministic.
 */
describe("warehouse rumor lead storylet (SPEC-63)", () => {
  const mk = (seed: string, flags: string[]): GameSession => {
    const { registries: regs, fingerprint } = loadPacks([opening, syndicate]);
    return new GameSession(regs, fingerprint, new InkNarrative(), {
      seed,
      startLocationId: DISTRICT,
      startPos: { x: 50, y: 50 },
      seedEvents: flags.map((f) => ({ type: "SetFlag", flag: FlagId.parse(f), to: true })),
    });
  };

  it("fires once when the rumor is heard and the drive isn't taken yet; replays identically", () => {
    const session = mk("rumor", ["flag.heard_warehouse_rumor"]);
    expect(hasStorylet(triggerOf(session.step([])), "storylet.warehouse_rumor_lead")).toBe(true);
    expect(hasStorylet(triggerOf(session.step([])), "storylet.warehouse_rumor_lead")).toBe(false); // fire-once
    const { fingerprint } = loadPacks([opening, syndicate]);
    const replayed = replay(
      createWorld({ seed: "rumor", startLocationId: DISTRICT, startPos: { x: 50, y: 50 } }),
      session.log,
      { against: fingerprint },
    );
    expect(hash(replayed)).toBe(hash(session.world));
  });

  it("does NOT fire once the drive is taken (the lead is moot)", () => {
    const session = mk("rumor2", ["flag.heard_warehouse_rumor", "flag.has_drive"]);
    expect(hasStorylet(triggerOf(session.step([])), "storylet.warehouse_rumor_lead")).toBe(false);
  });
});

/**
 * SPEC-66 — the Syndicate recruitment quest, the standing-payoff pair to SPEC-64's varga_trust. Gated
 * on ashfall_syndicate standing (earned by selling them the drive). Offer-gating proven via the engine's
 * ActivateQuest path; a branch completes end-to-end with its flag + reputation consequences.
 */
describe("syndicate recruitment quest (SPEC-66)", () => {
  const RQ = QuestId.parse("quest.syndicate_recruit");
  const withSynRep = (delta: number) => {
    let w = createWorld({ seed: "recruit", startLocationId: DISTRICT, skills: { persuade: 20, force: 20 } });
    if (delta !== 0) w = applyEvent(w, { type: "AdjustReputation", factionId: SYNDICATE, delta });
    return w;
  };
  const recruitOffered = (w: ReturnType<typeof createWorld>): boolean =>
    questSystem(registries.quests, [])(w, 0).some((e) => e.type === "ActivateQuest" && e.questId === RQ);

  it("does NOT offer below ashfall_syndicate standing 12, but DOES at/above it", () => {
    expect(recruitOffered(withSynRep(0))).toBe(false);
    expect(recruitOffered(withSynRep(11))).toBe(false);
    expect(recruitOffered(withSynRep(12))).toBe(true);
    expect(recruitOffered(withSynRep(20))).toBe(true);
  });

  it("the join branch completes end-to-end with its consequences", () => {
    let w = withSynRep(12);
    w = applyEvent(w, { type: "DialogueAdvanced", dialogueId: DLG, inkState: "{}", flags: {} });
    const attempt = [{ type: "Attempt" as const, questId: RQ, branchId: "join" }];
    for (let t = 0; t < 8 && w.quests[RQ]?.status !== "completed"; t++) {
      w = applyEvents(w, questSystem(registries.quests, attempt, registries.npcs)(w, 0));
    }
    expect(w.quests[RQ]?.completedBranchId).toBe("join");
    expect(w.flags[FlagId.parse("flag.syndicate_made_member")]).toBe(true);
    expect(w.flags[FlagId.parse("flag.syndicate_recruit_resolved")]).toBe(true);
    expect(w.reputation[SYNDICATE]).toBe(17); // 12 + 5
    expect(w.reputation[VARGA_CREW]).toBe(-5); // joining the Syndicate costs Varga standing
  });
});

/**
 * SPEC-86 — the leverage choice pays off: holding the drive over the Syndicate (flag.leveraged_syndicate)
 * summons a cleaner (quest.loose_ends). Offer gated on that flag; the talk_down branch completes via the
 * real engine. (The fight branch's defeat objective is solvability-verified by content:verify + the SPEC-72
 * defeat-requires-combat guard — the cleaner has combat.hp 14.)
 */
describe("syndicate cleaner — leverage payoff (SPEC-86)", () => {
  const LQ = QuestId.parse("quest.loose_ends");
  const CLEANER_DLG = DialogueId.parse("dialogue.syndicate_cleaner");
  const leveraged = (set: boolean): ReturnType<typeof createWorld> => {
    let w = createWorld({ seed: "cleaner", startLocationId: DISTRICT, skills: { persuade: 20 } });
    if (set) w = applyEvent(w, { type: "SetFlag", flag: FlagId.parse("flag.leveraged_syndicate"), to: true });
    return w;
  };
  const offered = (w: ReturnType<typeof createWorld>): boolean =>
    questSystem(registries.quests, [])(w, 0).some((e) => e.type === "ActivateQuest" && e.questId === LQ);

  it("does NOT summon the cleaner unless the player leveraged the Syndicate", () => {
    expect(offered(leveraged(false))).toBe(false);
    expect(offered(leveraged(true))).toBe(true);
  });

  it("the talk_down branch completes end-to-end with its consequence", () => {
    let w = leveraged(true);
    w = applyEvent(w, { type: "DialogueAdvanced", dialogueId: CLEANER_DLG, inkState: "{}", flags: {} });
    const attempt = [{ type: "Attempt" as const, questId: LQ, branchId: "talk_down" }];
    for (let t = 0; t < 8 && w.quests[LQ]?.status !== "completed"; t++) {
      w = applyEvents(w, questSystem(registries.quests, attempt, registries.npcs)(w, 0));
    }
    expect(w.quests[LQ]?.completedBranchId).toBe("talk_down");
    expect(w.flags[FlagId.parse("flag.cleaner_talked")]).toBe(true);
    expect(w.flags[FlagId.parse("flag.cleaner_resolved")]).toBe(true);
  });
});
