import type { Condition, ContentPack, Effect, Objective } from "@codex/content-schema";

/**
 * Referential-integrity pass (SCHEMA.md §8): every referenced NpcId/QuestId/ItemId/
 * LocationId/FactionId/DialogueId must resolve to a defined entity. A dangling reference
 * fails the load with the offending id + the exact path + the pack — so an AI-authored
 * pack can never silently break the game. FlagIds are intentionally NOT validated: flags
 * are free-form runtime world keys, not declared entities.
 */
export type RefType = "npc" | "quest" | "location" | "faction" | "item" | "dialogue";

interface Ref {
  type: RefType;
  id: string;
  where: string;
}

export interface IntegrityError extends Ref {
  pack: string;
}

function collectConditionRefs(cond: Condition, where: string, out: Ref[]): void {
  switch (cond.kind) {
    case "reputation_at_least":
      out.push({ type: "faction", id: cond.factionId, where });
      break;
    case "has_item":
      out.push({ type: "item", id: cond.itemId, where });
      break;
    case "quest_completed":
      out.push({ type: "quest", id: cond.questId, where });
      break;
    case "not":
      collectConditionRefs(cond.of, `${where}.not`, out);
      break;
    case "all":
    case "any":
      cond.of.forEach((c, i) => collectConditionRefs(c, `${where}.${cond.kind}[${i}]`, out));
      break;
    case "flag_is":
    case "credits_at_least":
      break;
  }
}

function collectEffectRefs(effect: Effect, where: string, out: Ref[]): void {
  switch (effect.kind) {
    case "adjust_reputation":
      out.push({ type: "faction", id: effect.factionId, where });
      break;
    case "give_item":
      out.push({ type: "item", id: effect.itemId, where });
      break;
    case "start_quest":
      out.push({ type: "quest", id: effect.questId, where });
      break;
    case "unlock_exit":
      out.push({ type: "location", id: effect.locationId, where });
      break;
    case "set_npc_dialogue":
      out.push({ type: "npc", id: effect.npcId, where });
      out.push({ type: "dialogue", id: effect.dialogueId, where });
      break;
    case "bribe_faction":
      out.push({ type: "faction", id: effect.factionId, where });
      break;
    case "set_flag":
    case "modify_skill":
    case "show_text":
      break;
  }
}

function collectObjectiveRefs(obj: Objective, where: string, out: Ref[]): void {
  switch (obj.kind) {
    case "talk_to":
    case "defeat":
      out.push({ type: "npc", id: obj.npcId, where });
      break;
    case "reach":
      out.push({ type: "location", id: obj.locationId, where });
      break;
    case "retrieve":
      out.push({ type: "item", id: obj.itemId, where });
      break;
    case "skill_check":
      obj.onFail.forEach((e, i) => collectEffectRefs(e, `${where}.onFail[${i}]`, out));
      break;
    case "set_flag":
      break;
  }
}

function collectPackRefs(pack: ContentPack, out: Ref[]): void {
  for (const loc of pack.locations) {
    loc.exits.forEach((exit, i) => {
      out.push({
        type: "location",
        id: exit.toLocationId,
        where: `${loc.id}.exits[${i}].toLocationId`,
      });
      exit.requires.forEach((c, j) =>
        collectConditionRefs(c, `${loc.id}.exits[${i}].requires[${j}]`, out),
      );
    });
    loc.npcSpawns.forEach((s, i) =>
      out.push({ type: "npc", id: s.npcId, where: `${loc.id}.npcSpawns[${i}].npcId` }),
    );
  }

  for (const npc of pack.npcs) {
    if (npc.faction) out.push({ type: "faction", id: npc.faction, where: `${npc.id}.faction` });
    if (npc.homeLocationId)
      out.push({ type: "location", id: npc.homeLocationId, where: `${npc.id}.homeLocationId` });
    out.push({ type: "dialogue", id: npc.dialogueId, where: `${npc.id}.dialogueId` });
    npc.reactsTo.forEach((r, i) => {
      r.when.forEach((c, j) => collectConditionRefs(c, `${npc.id}.reactsTo[${i}].when[${j}]`, out));
      if (r.overrideDialogueId)
        out.push({
          type: "dialogue",
          id: r.overrideDialogueId,
          where: `${npc.id}.reactsTo[${i}].overrideDialogueId`,
        });
    });
  }

  for (const faction of pack.factions) {
    faction.rivals.forEach((f, i) =>
      out.push({ type: "faction", id: f, where: `${faction.id}.rivals[${i}]` }),
    );
    faction.allies.forEach((f, i) =>
      out.push({ type: "faction", id: f, where: `${faction.id}.allies[${i}]` }),
    );
  }

  for (const quest of pack.quests) {
    if (quest.giverNpcId)
      out.push({ type: "npc", id: quest.giverNpcId, where: `${quest.id}.giverNpcId` });
    quest.offerWhen.forEach((c, i) => collectConditionRefs(c, `${quest.id}.offerWhen[${i}]`, out));
    quest.branches.forEach((branch, bi) => {
      const base = `${quest.id}.branches[${bi}]`;
      branch.objectives.forEach((o, oi) =>
        collectObjectiveRefs(o, `${base}.objectives[${oi}]`, out),
      );
      branch.onComplete.forEach((e, ei) => collectEffectRefs(e, `${base}.onComplete[${ei}]`, out));
      branch.onFail.forEach((e, ei) => collectEffectRefs(e, `${base}.onFail[${ei}]`, out));
    });
    quest.onAnyComplete.forEach((e, i) =>
      collectEffectRefs(e, `${quest.id}.onAnyComplete[${i}]`, out),
    );
    quest.rewards.items.forEach((it, i) =>
      out.push({ type: "item", id: it.itemId, where: `${quest.id}.rewards.items[${i}].itemId` }),
    );
    quest.rewards.reputation.forEach((rep, i) =>
      out.push({
        type: "faction",
        id: rep.factionId,
        where: `${quest.id}.rewards.reputation[${i}].factionId`,
      }),
    );
  }

  for (const storylet of pack.storylets) {
    const base = storylet.id;
    storylet.preconditions.forEach((c, i) =>
      collectConditionRefs(c, `${base}.preconditions[${i}]`, out),
    );
    if (storylet.content.dialogueId) {
      out.push({
        type: "dialogue",
        id: storylet.content.dialogueId,
        where: `${base}.content.dialogueId`,
      });
    }
    storylet.effects.forEach((e, i) => collectEffectRefs(e, `${base}.effects[${i}]`, out));
  }
}

function definedIds(packs: ContentPack[]): Record<RefType, Set<string>> {
  const sets: Record<RefType, Set<string>> = {
    npc: new Set(),
    quest: new Set(),
    location: new Set(),
    faction: new Set(),
    item: new Set(),
    dialogue: new Set(),
  };
  for (const pack of packs) {
    for (const e of pack.npcs) sets.npc.add(e.id);
    for (const e of pack.quests) sets.quest.add(e.id);
    for (const e of pack.locations) sets.location.add(e.id);
    for (const e of pack.factions) sets.faction.add(e.id);
    for (const e of pack.items) sets.item.add(e.id);
    for (const e of pack.dialogues) sets.dialogue.add(e.id);
  }
  return sets;
}

export function checkIntegrity(packs: ContentPack[]): IntegrityError[] {
  const defined = definedIds(packs);
  const errors: IntegrityError[] = [];
  for (const pack of packs) {
    const refs: Ref[] = [];
    collectPackRefs(pack, refs);
    for (const ref of refs) {
      if (!defined[ref.type].has(ref.id)) errors.push({ ...ref, pack: pack.id });
    }
  }
  return errors;
}
