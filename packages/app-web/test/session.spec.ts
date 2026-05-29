import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { QuestId, LocationId, FlagId, FactionId } from "@codex/content-schema";
import { createWorld, hash, replay, type InputEvent, type SkillId } from "@codex/engine-core";
import { InkNarrative } from "@codex/narrative-ink";
import { GameSession, type GameSessionOptions } from "../src/session";

const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const { registries, fingerprint } = loadPacks([raw]);
const QID = QuestId.parse("quest.the_warehouse");
const DISTRICT = LocationId.parse("location.ashfall_district");
const MET = FlagId.parse("flag.met_varga");
const SYNDICATE = FactionId.parse("faction.ashfall_syndicate");
const quest = registries.quests.get(QID)!;

const objKey = (branchId: string, i: number): string => `${branchId}#${i}`;

/** Navigator: one input toward the current objective of `branchId` (mirrors the app's intent). */
function navInputs(session: GameSession, branchId: string): InputEvent[] {
  const rt = session.world.quests[QID];
  if (!rt || rt.status !== "active") return [];
  const branch = quest.branches.find((b) => b.id === branchId)!;
  let i = 0;
  while (i < branch.objectives.length && rt.objectiveProgress[objKey(branchId, i)]?.done) i++;
  if (i >= branch.objectives.length) return [];
  const obj = branch.objectives[i]!;
  if (obj.kind === "reach") {
    if (session.world.locationId === obj.locationId) return [];
    const loc = registries.locations.get(session.world.locationId);
    const idx = loc ? loc.exits.findIndex((e) => e.toLocationId === obj.locationId) : -1;
    return idx >= 0 ? [{ type: "UseExit", exitIndex: idx }] : [];
  }
  if (obj.kind === "defeat") return [{ type: "Attack" }];
  if (obj.kind === "skill_check") return [{ type: "Attempt", questId: QID, branchId }];
  return [];
}

function newSession(skills: Partial<Record<SkillId, number>>): { session: GameSession; opts: GameSessionOptions } {
  const opts: GameSessionOptions = {
    seed: "first-light",
    startLocationId: DISTRICT,
    startPos: { x: 50, y: 50 },
    skills,
    seedEvents: [{ type: "SetFlag", flag: MET, to: true }],
  };
  return { session: new GameSession(registries, fingerprint, new InkNarrative(), opts), opts };
}

describe("GameSession (the playable app's headless heart)", () => {
  it("spawns the location's NPCs on entry and offers the quest", () => {
    const { session } = newSession({ force: 4 });
    expect(session.world.entities["entity.npc.varga"]).toBeDefined();
    session.step([]); // one tick: offerWhen (flag.met_varga) holds -> activate
    expect(session.world.quests[QID]?.status).toBe("active");
  });

  it("plays the force branch to completion through the real session and replays exactly", () => {
    // Pursuing "force" never issues an Attempt for the talk branch (S1.3), so the talk check
    // never fires and force is the deterministic winner — no skill tuning needed.
    const { session, opts } = newSession({ force: 4 });
    for (let t = 0; t < 80 && session.world.quests[QID]?.status !== "completed"; t++) {
      session.step(navInputs(session, "force"));
    }
    const rt = session.world.quests[QID]!;
    expect(rt.status).toBe("completed");
    expect(rt.completedBranchId).toBe("force");
    expect(session.world.reputation[SYNDICATE]).toBe(-15);
    expect(session.world.entities["entity.npc.warehouse_guard"]?.alive).toBe(false);

    // the entire session — seed events, NPC spawns, every tick — replays to the same hash
    const replayed = replay(createWorld(opts), session.log, { against: fingerprint });
    expect(hash(replayed)).toBe(hash(session.world));
  });
});
