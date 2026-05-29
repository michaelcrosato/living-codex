import type {
  ContentPack,
  ContentFingerprint,
  DialogueAsset,
  DialogueId,
  Faction,
  FactionId,
  ItemId,
  ItemTemplate,
  Location,
  LocationId,
  Npc,
  NpcId,
  Quest,
  QuestId,
} from "@codex/content-schema";
import { hashValue } from "./hash";

/**
 * The Registries shape (ARCHITECTURE.md §4): an indexed, frozen view of all content by
 * branded ID. This is what `engine-core` is *handed*; it never loads content itself.
 * Maps (not plain objects) are fine here — Registries are static loaded data, not `World`,
 * so the flat-data rule (WORLD_STATE.md §6) does not apply.
 */
export interface Registries {
  npcs: ReadonlyMap<NpcId, Npc>;
  quests: ReadonlyMap<QuestId, Quest>;
  locations: ReadonlyMap<LocationId, Location>;
  factions: ReadonlyMap<FactionId, Faction>;
  items: ReadonlyMap<ItemId, ItemTemplate>;
  dialogues: ReadonlyMap<DialogueId, DialogueAsset>;
}

export interface LoadResult {
  registries: Registries;
  fingerprint: ContentFingerprint;
}

function indexById<K extends string, V extends { id: K }>(
  packs: ContentPack[],
  pick: (pack: ContentPack) => readonly V[],
  kind: string,
): Map<K, V> {
  const map = new Map<K, V>();
  for (const pack of packs) {
    for (const entity of pick(pack)) {
      if (map.has(entity.id)) {
        throw new Error(`Duplicate ${kind} id "${entity.id}" (also defined before "${pack.id}").`);
      }
      map.set(entity.id, entity);
    }
  }
  return map;
}

export function buildRegistries(packs: ContentPack[]): Registries {
  const registries: Registries = {
    npcs: indexById(packs, (p) => p.npcs, "npc"),
    quests: indexById(packs, (p) => p.quests, "quest"),
    locations: indexById(packs, (p) => p.locations, "location"),
    factions: indexById(packs, (p) => p.factions, "faction"),
    items: indexById(packs, (p) => p.items, "item"),
    dialogues: indexById(packs, (p) => p.dialogues, "dialogue"),
  };
  return Object.freeze(registries);
}

/** A stable, order-independent fingerprint of the resolved registries (WORLD_STATE.md §7). */
export function fingerprintRegistries(
  packs: ContentPack[],
  registries: Registries,
): ContentFingerprint {
  const packsMap: Record<string, string> = {};
  for (const pack of packs) packsMap[pack.id] = pack.version;

  const sortedEntries = (map: ReadonlyMap<string, unknown>): [string, unknown][] =>
    [...map.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const canonical = {
    npcs: sortedEntries(registries.npcs),
    quests: sortedEntries(registries.quests),
    locations: sortedEntries(registries.locations),
    factions: sortedEntries(registries.factions),
    items: sortedEntries(registries.items),
    dialogues: sortedEntries(registries.dialogues),
  };
  return { packs: packsMap, registriesHash: hashValue(canonical) };
}
