import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { QuestId, FlagId, FactionId, ItemId, LocationId } from "@codex/content-schema";
import {
  createWorld,
  tick,
  replay,
  hash,
  createLog,
  applyEvent,
  interactionSystem,
  combatSystem,
  questSystem,
  type World,
  type Entity,
  type InputEvent,
  type CreateWorldOptions,
  type SkillId,
} from "@codex/engine-core";

/**
 * W6 — "The Warehouse, Three Ways." The agency thesis, proven end-to-end and headless:
 * a hand-authored pack loads through the REAL loader, the engine plays the quest three ways
 * through the REAL tick loop (interaction + combat + quests systems), each producing DISTINCT
 * persistent consequences, and every playthrough's event log replays to its exact state hash.
 */
const QID = QuestId.parse("quest.the_warehouse");
const DISTRICT = LocationId.parse("location.ashfall_district");
const DOOR = LocationId.parse("location.warehouse_door");
const MET = FlagId.parse("flag.met_varga");
const PEACE = FlagId.parse("flag.entered_peacefully");
const UNSEEN = FlagId.parse("flag.entered_unseen");
const HAS_DRIVE = FlagId.parse("flag.has_drive");
const DRIVE = ItemId.parse("item.encrypted_drive");
const SYNDICATE = FactionId.parse("faction.ashfall_syndicate");

const rawPack = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const { registries, fingerprint } = loadPacks([rawPack]);
const quest = registries.quests.get(QID)!;

const objKey = (branchId: string, i: number): string => `${branchId}#${i}`;

/** A tiny deterministic "navigator": one input toward the current objective of `branchId`. */
function nextInputs(world: World, branchId: string): InputEvent[] {
  const rt = world.quests[QID];
  if (!rt || rt.status !== "active") return [];
  const branch = quest.branches.find((b) => b.id === branchId)!;
  let i = 0;
  while (i < branch.objectives.length && rt.objectiveProgress[objKey(branchId, i)]?.done) i++;
  if (i >= branch.objectives.length) return [];
  const obj = branch.objectives[i]!;
  if (obj.kind === "reach") {
    if (world.locationId === obj.locationId) return [];
    const loc = registries.locations.get(world.locationId);
    const idx = loc ? loc.exits.findIndex((e) => e.toLocationId === obj.locationId) : -1;
    return idx >= 0 ? [{ type: "UseExit", exitIndex: idx }] : [];
  }
  if (obj.kind === "defeat") return [{ type: "Attack" }];
  if (obj.kind === "skill_check") return [{ type: "Attempt", questId: QID, branchId }];
  return [];
}

interface Playthrough {
  world: World;
  opts: CreateWorldOptions;
  log: ReturnType<typeof createLog>;
}

function play(branchId: string, skills: Partial<Record<SkillId, number>>): Playthrough {
  const opts: CreateWorldOptions = {
    seed: `warehouse:${branchId}`,
    startLocationId: DISTRICT,
    startPos: { x: 50, y: 50 },
    skills,
  };
  const log = createLog(opts.seed, fingerprint);
  let world = createWorld(opts);

  // Setup (logged so replay reproduces it): you've met Varga, and a guard mans the door.
  const guard: Entity = {
    id: "entity.guard",
    defId: "npc.warehouse_guard",
    locationId: DOOR,
    pos: { x: 200, y: 150 },
    hp: 12,
    alive: true,
  };
  for (const ev of [
    { type: "SpawnEntity", entity: guard } as const,
    { type: "SetFlag", flag: MET, to: true } as const,
  ]) {
    log.entries.push({ tick: 0, kind: "event", event: ev });
    world = applyEvent(world, ev);
  }

  const ctx = { locations: registries.locations, npcs: registries.npcs };
  for (let t = 0; t < 60 && world.quests[QID]?.status !== "completed"; t++) {
    const inputs = nextInputs(world, branchId);
    const systems = [interactionSystem(inputs, ctx), combatSystem(inputs), questSystem(registries.quests, inputs)];
    const result = tick(world, inputs, systems, 1 / 60);
    log.entries.push(...result.entries);
    world = result.world;
  }
  return { world, opts, log };
}

function assertReplayMatches(p: Playthrough): void {
  const replayed = replay(createWorld(p.opts), p.log, { against: fingerprint });
  expect(hash(replayed)).toBe(hash(p.world));
}

describe("The Warehouse, Three Ways (agency proven, replayable)", () => {
  const talk = play("talk", { persuade: 20 });
  const sneak = play("sneak", { sneak: 20 });
  const force = play("force", { force: 4 }); // pursuing force never attempts talk's check (S1.3) -> force wins

  it("all three branches complete the quest", () => {
    expect(talk.world.quests[QID]?.status).toBe("completed");
    expect(sneak.world.quests[QID]?.status).toBe("completed");
    expect(force.world.quests[QID]?.status).toBe("completed");
    expect(talk.world.quests[QID]?.completedBranchId).toBe("talk");
    expect(sneak.world.quests[QID]?.completedBranchId).toBe("sneak");
    expect(force.world.quests[QID]?.completedBranchId).toBe("force");
  });

  it("each produces a DISTINCT, persistent consequence", () => {
    // talk: entered peacefully, no rep hit
    expect(talk.world.flags[PEACE]).toBe(true);
    expect(talk.world.flags[UNSEEN]).toBeUndefined();
    expect(talk.world.reputation[SYNDICATE]).toBeUndefined();

    // sneak: entered unseen, no rep hit, not peaceful-by-persuasion
    expect(sneak.world.flags[UNSEEN]).toBe(true);
    expect(sneak.world.flags[PEACE]).toBeUndefined();
    expect(sneak.world.reputation[SYNDICATE]).toBeUndefined();

    // force: the world remembers — Syndicate reputation took the hit
    expect(force.world.reputation[SYNDICATE]).toBe(-15);
    expect(force.world.flags[PEACE]).toBeUndefined();
    expect(force.world.flags[UNSEEN]).toBeUndefined();
    expect(force.world.entities["entity.guard"]?.alive).toBe(false);
  });

  it("the shared payoff (the drive + reward) lands on every path", () => {
    for (const p of [talk, sneak, force]) {
      expect(p.world.flags[HAS_DRIVE]).toBe(true);
      expect(p.world.inventory[DRIVE]).toBe(1);
      expect(p.world.inventory[ItemId.parse("item.credits")]).toBe(200);
    }
  });

  it("the three outcomes are genuinely different worlds", () => {
    const hashes = new Set([hash(talk.world), hash(sneak.world), hash(force.world)]);
    expect(hashes.size).toBe(3);
  });

  it("every playthrough replays to its exact state hash", () => {
    assertReplayMatches(talk);
    assertReplayMatches(sneak);
    assertReplayMatches(force);
  });
});
