import type {
  ContentPack,
  CanonAssertion,
  CanonStatus,
  FactionId,
  ItemId,
  LocationId,
  NpcId,
  QuestId,
} from "@codex/content-schema";
import type { Registries } from "./registries";

/**
 * The canon assertion graph (CONTENT_PIPELINE.md §6) — the deferred "structured assertions a
 * check can query" that the ID-level canon index could not provide. It catches *semantic*
 * contradictions the loader's referential integrity can't: a patron asserted broke who also
 * funds a faction, an NPC asserted dead who is still placed in the world, allies who are also
 * enemies.
 *
 * Every record is tagged with the pack that introduced it (provenance / blast radius) and
 * whether it was AUTHORED (`pack.assertions`) or DERIVED from structural canon. Derived facts
 * are restricted to canonical truths — an NPC's faction, a faction's allies/rivals, and the
 * placement that means the world spawns an NPC (so they are canonically present ⟹ alive). We
 * deliberately do NOT derive death from a quest's `defeat` objective: that is a *Possible
 * Outcome*, not canon (WORLD_BIBLE.md §A.3).
 */
export interface AssertionRecord {
  assertion: CanonAssertion;
  source: string; // packId that introduced it
  derived: boolean; // inferred from structural data rather than authored
}

export interface CanonGraph {
  records: AssertionRecord[];
}

export type CanonRule =
  | "exclusive-status"
  | "allegiance-polarity"
  | "funds-while-broke"
  | "dangling-ref";

export interface CanonContradiction {
  rule: CanonRule;
  message: string;
  subjects: string[]; // entity ids involved
  sources: string[]; // packs involved — the blast radius the human must reconcile
}

/** Mutually-exclusive status groups: a subject may hold at most one state per group per epoch. */
const STATUS_GROUP: Record<CanonStatus, "life" | "solvency"> = {
  alive: "life",
  dead: "life",
  missing: "life",
  broke: "solvency",
  solvent: "solvency",
  wealthy: "solvency",
};

function assertionKey(a: CanonAssertion): string {
  switch (a.predicate) {
    case "status":
      return `status|${a.subject}|${a.state}|${a.since ?? "-"}`;
    case "fact":
      return `fact|${a.subject}|${a.note}`;
    default:
      return `${a.predicate}|${a.subject}|${a.object}`;
  }
}

function uniqueSources(records: readonly AssertionRecord[]): string[] {
  return [...new Set(records.map((r) => r.source))].sort();
}

export function buildCanonGraph(packs: readonly ContentPack[]): CanonGraph {
  const records: AssertionRecord[] = [];
  const seen = new Set<string>();
  const add = (assertion: CanonAssertion, source: string, derived: boolean): void => {
    // Dedup identical (assertion, source) pairs; keep cross-pack duplicates so a contradiction's
    // reported blast radius lists every pack that asserted the conflicting fact.
    const key = `${source}|${assertionKey(assertion)}`;
    if (seen.has(key)) return;
    seen.add(key);
    records.push({ assertion, source, derived });
  };

  for (const pack of packs) {
    for (const a of pack.assertions) add(a, pack.id, false);

    for (const npc of pack.npcs) {
      if (npc.faction) {
        add({ predicate: "member_of", subject: npc.id, object: npc.faction }, pack.id, true);
      }
      if (npc.homeLocationId) {
        add(
          { predicate: "located_in", subject: npc.id, object: npc.homeLocationId },
          pack.id,
          true,
        );
        add({ predicate: "status", subject: npc.id, state: "alive" }, pack.id, true);
      }
    }

    for (const loc of pack.locations) {
      for (const spawn of loc.npcSpawns) {
        add({ predicate: "located_in", subject: spawn.npcId, object: loc.id }, pack.id, true);
        add({ predicate: "status", subject: spawn.npcId, state: "alive" }, pack.id, true);
      }
    }

    for (const faction of pack.factions) {
      for (const ally of faction.allies) {
        add({ predicate: "allied_with", subject: faction.id, object: ally }, pack.id, true);
      }
      for (const rival of faction.rivals) {
        add({ predicate: "enemy_of", subject: faction.id, object: rival }, pack.id, true);
      }
    }
  }

  return { records };
}

function statusConflicts(records: readonly AssertionRecord[]): CanonContradiction[] {
  // Group conflicting states by subject + exclusion group + epoch. Two different states in the
  // same group AND the same epoch contradict; differing `since` epochs are a legitimate timeline.
  const buckets = new Map<string, Map<CanonStatus, AssertionRecord>>();
  for (const r of records) {
    if (r.assertion.predicate !== "status") continue;
    const group = STATUS_GROUP[r.assertion.state];
    const epoch = r.assertion.since ?? "base";
    const key = `${r.assertion.subject}|${group}|${epoch}`;
    const states = buckets.get(key) ?? new Map<CanonStatus, AssertionRecord>();
    states.set(r.assertion.state, r);
    buckets.set(key, states);
  }

  const out: CanonContradiction[] = [];
  for (const [key, states] of buckets) {
    if (states.size < 2) continue;
    const subject = key.split("|")[0]!;
    out.push({
      rule: "exclusive-status",
      message: `"${subject}" is asserted ${[...states.keys()].join(" and ")} in the same epoch — mutually exclusive.`,
      subjects: [subject],
      sources: uniqueSources([...states.values()]),
    });
  }
  return out;
}

function allegianceConflicts(records: readonly AssertionRecord[]): CanonContradiction[] {
  // Allegiance is symmetric: normalize each pair so allied_with(a,b) and enemy_of(b,a) collide.
  const pairs = new Map<string, { allied: AssertionRecord[]; enemy: AssertionRecord[] }>();
  for (const r of records) {
    const p = r.assertion.predicate;
    if (p !== "allied_with" && p !== "enemy_of") continue;
    const [x, y] = [r.assertion.subject, r.assertion.object].sort();
    const key = `${x}|${y}`;
    const entry = pairs.get(key) ?? { allied: [], enemy: [] };
    (p === "allied_with" ? entry.allied : entry.enemy).push(r);
    pairs.set(key, entry);
  }

  const out: CanonContradiction[] = [];
  for (const [key, entry] of pairs) {
    if (entry.allied.length === 0 || entry.enemy.length === 0) continue;
    const [x, y] = key.split("|") as [string, string];
    out.push({
      rule: "allegiance-polarity",
      message: `"${x}" and "${y}" are asserted both allied and enemies.`,
      subjects: [x, y],
      sources: uniqueSources([...entry.allied, ...entry.enemy]),
    });
  }
  return out;
}

function fundsWhileBroke(records: readonly AssertionRecord[]): CanonContradiction[] {
  // The §6 example: "secretly broke" (status broke) vs "quietly funds the Syndicate" (funds).
  // Funding is treated as a standing fact, so any broke status for the same subject contradicts.
  const funders = new Map<string, AssertionRecord[]>();
  const broke = new Map<string, AssertionRecord[]>();
  const push = (m: Map<string, AssertionRecord[]>, k: string, r: AssertionRecord): void => {
    const list = m.get(k) ?? [];
    list.push(r);
    m.set(k, list);
  };
  for (const r of records) {
    if (r.assertion.predicate === "funds") push(funders, r.assertion.subject, r);
    else if (r.assertion.predicate === "status" && r.assertion.state === "broke") {
      push(broke, r.assertion.subject, r);
    }
  }

  const out: CanonContradiction[] = [];
  for (const [subject, frecs] of funders) {
    const brecs = broke.get(subject);
    if (!brecs) continue;
    out.push({
      rule: "funds-while-broke",
      message: `"${subject}" funds a faction yet is asserted broke — they cannot do both.`,
      subjects: [subject],
      sources: uniqueSources([...frecs, ...brecs]),
    });
  }
  return out;
}

/** Query the graph for semantic contradictions (rules that need no registry lookup). */
export function findCanonContradictions(graph: CanonGraph): CanonContradiction[] {
  return [
    ...statusConflicts(graph.records),
    ...allegianceConflicts(graph.records),
    ...fundsWhileBroke(graph.records),
  ];
}

function refExists(registries: Registries, id: string): boolean {
  const kind = id.slice(0, id.indexOf("."));
  switch (kind) {
    case "npc":
      return registries.npcs.has(id as NpcId);
    case "faction":
      return registries.factions.has(id as FactionId);
    case "location":
      return registries.locations.has(id as LocationId);
    case "item":
      return registries.items.has(id as ItemId);
    case "quest":
      return registries.quests.has(id as QuestId);
    default:
      return false;
  }
}

/** Referential integrity for the assertion layer: every AUTHORED ref must resolve to a real entity. */
export function findDanglingAssertionRefs(
  graph: CanonGraph,
  registries: Registries,
): CanonContradiction[] {
  const out: CanonContradiction[] = [];
  for (const record of graph.records) {
    if (record.derived) continue; // derived refs come from real entities by construction
    const a = record.assertion;
    const refs =
      a.predicate === "status" || a.predicate === "fact" ? [a.subject] : [a.subject, a.object];
    for (const ref of refs) {
      if (refExists(registries, ref)) continue;
      out.push({
        rule: "dangling-ref",
        message: `assertion (${a.predicate}) references "${ref}", which does not exist in canon.`,
        subjects: [ref],
        sources: [record.source],
      });
    }
  }
  return out;
}

/** Build the graph and run every rule. Pass `registries` to also check assertion-ref integrity. */
export function auditCanon(
  packs: readonly ContentPack[],
  registries?: Registries,
): CanonContradiction[] {
  const graph = buildCanonGraph(packs);
  const out = findCanonContradictions(graph);
  if (registries) out.push(...findDanglingAssertionRefs(graph, registries));
  return out;
}

export function serializeAssertion(a: CanonAssertion): string {
  switch (a.predicate) {
    case "status":
      return `${a.subject} is ${a.state}${a.since !== undefined ? ` since epoch ${a.since}` : ""}`;
    case "fact":
      return `${a.subject}: ${a.note}`;
    case "member_of":
      return `${a.subject} is member of ${a.object}`;
    case "allied_with":
      return `${a.subject} allied with ${a.object}`;
    case "enemy_of":
      return `${a.subject} enemy of ${a.object}`;
    case "funds":
      return `${a.subject} funds ${a.object}`;
    case "located_in":
      return `${a.subject} located in ${a.object}`;
  }
}

export function renderAssertionRecord(r: AssertionRecord): string {
  const derStr = r.derived ? " [derived]" : "";
  return `- ${serializeAssertion(r.assertion)} (from ${r.source}${derStr})`;
}

/**
 * Query the canon graph for a subgraph relevant to a set of seed IDs (the brief's `ground_in`
 * plus their 1-hop neighbors). Returns a deterministic set of AssertionRecords.
 */
export function relevantSubgraph(graph: CanonGraph, seedIds: readonly string[]): CanonGraph {
  const seeds = new Set(seedIds);
  const neighbors = new Set<string>();

  // 1. Identify 1-hop neighbors of the seeds
  for (const r of graph.records) {
    const a = r.assertion;
    if (a.predicate !== "status" && a.predicate !== "fact") {
      // Binary predicate
      if (seeds.has(a.subject)) {
        neighbors.add(a.object);
      }
      if (seeds.has(a.object)) {
        neighbors.add(a.subject);
      }
    }
  }

  const relevantEntities = new Set([...seeds, ...neighbors]);

  // 2. Select records where subject or object is in the relevant set
  const records = graph.records.filter((r) => {
    const a = r.assertion;
    if (relevantEntities.has(a.subject)) return true;
    if (a.predicate !== "status" && a.predicate !== "fact") {
      if (relevantEntities.has(a.object)) return true;
    }
    return false;
  });

  // 3. Deterministically sort records to ensure reproducibility
  records.sort((a, b) => {
    if (a.source !== b.source) {
      return a.source.localeCompare(b.source);
    }
    const keyA = assertionKey(a.assertion);
    const keyB = assertionKey(b.assertion);
    if (keyA !== keyB) {
      return keyA.localeCompare(keyB);
    }
    if (a.derived !== b.derived) {
      return a.derived ? 1 : -1;
    }
    return 0;
  });

  return { records };
}
