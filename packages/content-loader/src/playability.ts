import type { Condition, Effect, Objective, Quest } from "@codex/content-schema";
import type { Registries } from "./registries";
import { unsatisfiablePreconditions } from "./storylet-check";

export interface PlayabilityReport {
  errors: string[];
  warnings: string[];
}

/**
 * Static solvability/reachability analysis (ARCHITECTURE.md §7): schema-valid ≠ playable. Beyond the
 * loader's referential integrity, this catches content that would be unwinnable or that points an
 * effect at a nonexistent slot:
 *   - every quest has ≥1 branch whose objectives are individually satisfiable in principle (a `defeat`
 *     objective requires the target NPC to carry combat stats, else the branch is unwinnable — SPEC-72);
 *   - every `reach` target is connected to the location graph (no island locations);
 *   - every `unlock_exit` effect's exitIndex is within the target location's exits array (the loader
 *     checks the location id exists, but NOT that the index is in range);
 *   - no quest has directly contradictory `flag_is` gates in `offerWhen` (it could never be offered);
 *   - no storylet has unsatisfiable preconditions (it could never fire); always-on noise is warned;
 *   - no dialogue is orphaned (defined but referenced by nothing — warned, SPEC-53);
 *   - no NPC is unspawnable (no homeLocationId and in no location's npcSpawns — warned, SPEC-60);
 *   - no multi-branch quest has a branch whose objectives are all `talk_to` the giver (it auto-completes at
 *     offer and shadows siblings — warned, SPEC-68);
 *   - no `flag_is` gate reads a flag that nothing sets (unsatisfiable — content can't trigger — warned, SPEC-70);
 *   - no `retrieve` objective targets an item that no `give_item` effect or quest reward ever grants (it
 *     could never be collected — warned, SPEC-104);
 *   - no `has_item` gate reads an item that nothing grants (unsatisfiable gate, the item-analog of the
 *     SPEC-70 flag check — warned, SPEC-105);
 *   - no cycle of `quest_completed` offer-prerequisites (quests that gate each other's `offerWhen` and so
 *     can never be offered — the temporal-causality failure mode; warned, SPEC-110).
 *
 * Pure over `registries` so it is unit-testable; the `content:verify` script is the thin CLI that
 * loads packs, runs this plus `auditCanon`, and reports (errors → exit 1).
 */
export function staticPlayabilityCheck(registries: Registries): PlayabilityReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Locations you can actually enter: the destination of some exit. A reach() target that is an
  // island (no exits in OR out) is unwinnable — something the loader's ref-integrity can't catch.
  const enterable = new Set<string>();
  for (const loc of registries.locations.values()) {
    for (const exit of loc.exits) enterable.add(exit.toLocationId);
  }

  /** An objective is satisfiable-in-principle if its referenced entity exists and bounds hold. */
  const objectiveSatisfiable = (obj: Objective): boolean => {
    switch (obj.kind) {
      case "reach":
        return registries.locations.has(obj.locationId);
      case "retrieve":
        return obj.count > 0;
      case "defeat":
        // A defeat objective is only satisfiable if the target can actually be fought: the NPC must
        // exist AND carry combat stats (combat.hp). A defeat on a non-combat NPC is unwinnable (SPEC-72).
        return registries.npcs.get(obj.npcId)?.combat !== undefined;
      case "talk_to":
        return registries.npcs.has(obj.npcId);
      case "skill_check":
        return obj.dc <= 20; // a natural 20 (+skill) can always clear a dc ≤ 20
      case "set_flag":
        return true;
    }
  };

  const checkUnlockExits = (effects: readonly Effect[], where: string): void => {
    for (const effect of effects) {
      if (effect.kind !== "unlock_exit") continue;
      const location = registries.locations.get(effect.locationId);
      const count = location?.exits.length ?? 0;
      if (effect.exitIndex >= count) {
        errors.push(
          `${where}: unlock_exit index ${effect.exitIndex} out of range for "${effect.locationId}" (has ${count} exit(s)).`,
        );
      }
    }
  };

  const checkQuest = (quest: Quest): void => {
    const solvableBranch = quest.branches.find((b) => b.objectives.every(objectiveSatisfiable));
    if (!solvableBranch) {
      errors.push(`${quest.id}: no branch is solvable from the initial state.`);
    }
    for (const branch of quest.branches) {
      checkUnlockExits(branch.onComplete, `${quest.id}.branches.${branch.id}.onComplete`);
      checkUnlockExits(branch.onFail, `${quest.id}.branches.${branch.id}.onFail`);
      for (const obj of branch.objectives) {
        // A defeat objective whose target NPC carries no combat stats can never be completed — the branch
        // is unwinnable even if the quest has other solvable branches (SPEC-72). combat.hp is final per NPC
        // (defined once; integrity.ts catches a dangling npcId), so this is unambiguous → a hard error.
        if (obj.kind === "defeat" && registries.npcs.get(obj.npcId)?.combat === undefined) {
          errors.push(
            `${quest.id}.branches.${branch.id}: defeat target "${obj.npcId}" has no combat stats (combat.hp) — the branch is unwinnable.`,
          );
        }
        if (obj.kind === "skill_check") {
          checkUnlockExits(obj.onFail, `${quest.id}.branches.${branch.id}.skill_check.onFail`);
        }
      }
    }
    checkUnlockExits(quest.onAnyComplete, `${quest.id}.onAnyComplete`);
  };

  /** Every reach() target must be connected to the location graph (catches island locations). */
  const checkReachability = (quest: Quest): void => {
    for (const branch of quest.branches) {
      for (const obj of branch.objectives) {
        if (obj.kind !== "reach") continue;
        const loc = registries.locations.get(obj.locationId);
        const connected = enterable.has(obj.locationId) || (loc?.exits.length ?? 0) > 0;
        if (loc && !connected) {
          errors.push(
            `${quest.id}.${branch.id}: reach target "${obj.locationId}" is an island (no exits in or out) — unreachable.`,
          );
        }
      }
    }
  };

  /** A quest with directly contradictory flag_is gates in offerWhen can never be offered. */
  const checkOfferWhen = (quest: Quest): void => {
    const seen = new Map<string, boolean | number | string>();
    for (const cond of quest.offerWhen) {
      if (cond.kind !== "flag_is") continue;
      const prev = seen.get(cond.flag);
      if (prev !== undefined && prev !== cond.equals) {
        errors.push(
          `${quest.id}.offerWhen: contradictory flag_is on "${cond.flag}" — the quest can never be offered.`,
        );
      }
      seen.set(cond.flag, cond.equals);
    }
  };

  for (const quest of registries.quests.values()) {
    checkQuest(quest);
    checkReachability(quest);
    checkOfferWhen(quest);
  }

  // Orphaned dialogues (SPEC-53): a DialogueAsset can be schema-valid + integrity-clean yet referenced
  // by nothing — dead content that ships but can never be seen (the kestrel-pack hazard, one level down).
  // Collect every referenced dialogue id, then warn (not error: on a subset load a dialogue referenced
  // only by a not-yet-loaded pack would look orphaned) on any defined-but-unreferenced dialogue.
  const referencedDialogues = new Set<string>();
  const noteEffectDialogues = (effects: readonly Effect[]): void => {
    for (const effect of effects) {
      if (effect.kind === "set_npc_dialogue") referencedDialogues.add(effect.dialogueId);
    }
  };
  for (const npc of registries.npcs.values()) {
    referencedDialogues.add(npc.dialogueId);
    for (const reaction of npc.reactsTo) {
      if (reaction.overrideDialogueId) referencedDialogues.add(reaction.overrideDialogueId);
    }
  }
  for (const storylet of registries.storylets.values()) {
    if (storylet.content.dialogueId) referencedDialogues.add(storylet.content.dialogueId);
  }
  for (const quest of registries.quests.values()) {
    noteEffectDialogues(quest.onAnyComplete);
    for (const branch of quest.branches) {
      noteEffectDialogues(branch.onComplete);
      noteEffectDialogues(branch.onFail);
      for (const obj of branch.objectives) {
        if (obj.kind === "skill_check") noteEffectDialogues(obj.onFail);
      }
    }
  }
  for (const id of registries.dialogues.keys()) {
    if (!referencedDialogues.has(id)) {
      warnings.push(
        `${id}: orphaned dialogue — no NPC, reaction, storylet, or set_npc_dialogue effect references it; it can never be shown.`,
      );
    }
  }

  // Storylets (SPEC-25): the loader already proved their refs resolve (integrity.ts). Here we catch
  // DEAD storylets — preconditions that can never simultaneously hold, so the storylet would never
  // fire — plus a non-fatal hygiene warning for always-on noise (no preconditions AND salience 0).
  for (const storylet of registries.storylets.values()) {
    const reason = unsatisfiablePreconditions(storylet.preconditions);
    if (reason) {
      errors.push(`${storylet.id}: unsatisfiable preconditions — ${reason}.`);
    }
    if (storylet.preconditions.length === 0 && storylet.salience === 0) {
      warnings.push(
        `${storylet.id}: no preconditions and salience 0 — always-on ambient noise; gate it or raise salience.`,
      );
    }
  }

  // Unspawnable NPCs (SPEC-60, generalizing SPEC-59): the app spawns an NPC only via its `homeLocationId`
  // or a location's `npcSpawns`. An NPC with neither is loaded but placed nowhere — unreachable in play.
  // Warn (not error): on a subset load a location in a not-yet-loaded pack could carry the spawn.
  const spawnedByLocation = new Set<string>();
  for (const loc of registries.locations.values()) {
    for (const spawn of loc.npcSpawns) spawnedByLocation.add(spawn.npcId);
  }
  for (const npc of registries.npcs.values()) {
    if (!npc.homeLocationId && !spawnedByLocation.has(npc.id)) {
      warnings.push(
        `${npc.id}: unspawnable NPC — no homeLocationId and no location npcSpawns entry; it can never be reached in play.`,
      );
    }
  }

  // Branch shadowing (SPEC-68, generalizing SPEC-67): questSystem completes ANY active branch whose
  // objectives are all done. Taking a quest's offer means talking to its GIVER, so a branch whose objectives
  // are ALL `talk_to` the giver is already satisfied the instant the quest activates — it auto-completes and
  // shadows its siblings (the intended choices become unreachable). This is the precise, statically-decidable
  // harmful case: `talk_to` a NON-giver NPC is a legitimate choice mechanic (the player must seek that NPC),
  // so it is NOT flagged. Warn (not error); single-branch quests have no siblings to shadow.
  for (const quest of registries.quests.values()) {
    if (quest.branches.length < 2 || !quest.giverNpcId) continue;
    for (const branch of quest.branches) {
      const autoAtOffer =
        branch.objectives.length > 0 &&
        branch.objectives.every((o) => o.kind === "talk_to" && o.npcId === quest.giverNpcId);
      if (autoAtOffer) {
        warnings.push(
          `${quest.id}.branches.${branch.id}: every objective is talk_to the quest giver — it auto-completes when the offer is taken and shadows the other branches; add a skill_check/reach/defeat/retrieve.`,
        );
      }
    }
  }

  // Unsatisfiable flag gates (SPEC-70): every flag is content-driven — set only by `set_flag` effects,
  // `reactsTo.setsFlags`, or an Ink `declaredVars` name mirrored to `flag.<var>` (dialogue.ts). A flag READ
  // in a `flag_is` gate (offerWhen / storylet precondition / reactsTo when / exit requires) but SET by
  // nothing can never become true — the content behind that gate can never trigger. Warn (advisory; like the
  // other playability hygiene warnings — a subset load could legitimately set the flag in another pack).
  const setFlags = new Set<string>();
  const readFlags = new Set<string>();
  const noteEffectFlags = (effects: readonly Effect[]): void => {
    for (const e of effects) if (e.kind === "set_flag") setFlags.add(e.flag);
  };
  const noteConditionFlags = (cond: Condition): void => {
    if (cond.kind === "flag_is") readFlags.add(cond.flag);
    else if (cond.kind === "not") noteConditionFlags(cond.of);
    else if (cond.kind === "all" || cond.kind === "any") cond.of.forEach(noteConditionFlags);
  };
  for (const d of registries.dialogues.values())
    for (const v of d.declaredVars) setFlags.add(`flag.${v}`);
  for (const npc of registries.npcs.values()) {
    for (const r of npc.reactsTo) {
      r.when.forEach(noteConditionFlags);
      for (const fe of r.setsFlags) setFlags.add(fe.flag);
    }
  }
  for (const s of registries.storylets.values()) {
    s.preconditions.forEach(noteConditionFlags);
    noteEffectFlags(s.effects);
  }
  for (const loc of registries.locations.values()) {
    for (const ex of loc.exits) ex.requires.forEach(noteConditionFlags);
  }
  for (const quest of registries.quests.values()) {
    quest.offerWhen.forEach(noteConditionFlags);
    noteEffectFlags(quest.onAnyComplete);
    for (const b of quest.branches) {
      noteEffectFlags(b.onComplete);
      noteEffectFlags(b.onFail);
      for (const o of b.objectives) {
        if (o.kind === "set_flag") setFlags.add(o.flag);
        if (o.kind === "skill_check") noteEffectFlags(o.onFail);
      }
    }
  }
  for (const flag of readFlags) {
    if (!setFlags.has(flag)) {
      warnings.push(
        `flag gate "${flag}" is read (flag_is) but set by nothing — the content gated on it can never trigger.`,
      );
    }
  }

  // Unobtainable retrieve items (SPEC-104): the engine adds an item to inventory ONLY via a GiveItem
  // event — sourced from a `give_item` effect or a quest's reward (rewards.items / rewards.credits;
  // starting inventory is empty + combat drops nothing). So a `retrieve` objective whose item is granted
  // by nothing can never be collected — the branch is unwinnable. This completes the unwinnability family:
  // `defeat` (combat.hp, SPEC-72), `reach` (island), and now `retrieve`. Warn (not error): like the flag-gate
  // (SPEC-70) and unspawnable-NPC (SPEC-60) checks, an item grant is EXTRINSIC — a not-yet-loaded pack could
  // give_item it on a subset load — unlike `defeat`'s intrinsic combat.hp (a hard error).
  const obtainableItems = new Set<string>();
  const noteEffectItems = (effects: readonly Effect[]): void => {
    for (const e of effects) if (e.kind === "give_item") obtainableItems.add(e.itemId);
  };
  for (const s of registries.storylets.values()) noteEffectItems(s.effects);
  for (const quest of registries.quests.values()) {
    noteEffectItems(quest.onAnyComplete);
    for (const reward of quest.rewards.items) obtainableItems.add(reward.itemId);
    // The engine grants reward credits as the `item.credits` inventory entry (WORLD_STATE; apply.ts
    // bribe path spends it). Literal here because content-loader must not import engine-core (deps rule).
    if (quest.rewards.credits > 0) obtainableItems.add("item.credits");
    for (const branch of quest.branches) {
      noteEffectItems(branch.onComplete);
      noteEffectItems(branch.onFail);
      for (const obj of branch.objectives) {
        if (obj.kind === "skill_check") noteEffectItems(obj.onFail);
      }
    }
  }
  for (const quest of registries.quests.values()) {
    for (const branch of quest.branches) {
      for (const obj of branch.objectives) {
        if (obj.kind === "retrieve" && !obtainableItems.has(obj.itemId)) {
          warnings.push(
            `${quest.id}.branches.${branch.id}: retrieve target "${obj.itemId}" is granted by no give_item effect or quest reward — the objective can never be completed.`,
          );
        }
      }
    }
  }

  // Unsatisfiable has_item gates (SPEC-105): the item-analog of the SPEC-70 flag-gate check, reusing the
  // obtainableItems set above. A `has_item` condition (offerWhen / storylet precondition / exit requires /
  // reactsTo when) reading an item that nothing grants can never hold — the content behind that gate can
  // never trigger. Same four gate sites + recursion as the flag walk; warn (extrinsic/subset-safe).
  const readItems = new Set<string>();
  const noteConditionItems = (cond: Condition): void => {
    if (cond.kind === "has_item") readItems.add(cond.itemId);
    else if (cond.kind === "not") noteConditionItems(cond.of);
    else if (cond.kind === "all" || cond.kind === "any") cond.of.forEach(noteConditionItems);
  };
  for (const quest of registries.quests.values()) quest.offerWhen.forEach(noteConditionItems);
  for (const s of registries.storylets.values()) s.preconditions.forEach(noteConditionItems);
  for (const loc of registries.locations.values())
    for (const ex of loc.exits) ex.requires.forEach(noteConditionItems);
  for (const npc of registries.npcs.values())
    for (const r of npc.reactsTo) r.when.forEach(noteConditionItems);
  for (const item of readItems) {
    if (!obtainableItems.has(item)) {
      warnings.push(
        `has_item gate "${item}" is read but granted by no give_item effect or quest reward — the content gated on it can never trigger.`,
      );
    }
  }

  // Quest-offer prerequisite cycles (SPEC-110): a `quest_completed(P)` condition in quest Q's `offerWhen`
  // means Q's OFFER requires P completed first. A cycle in this hard-prerequisite graph means those quests
  // can never be offered (no causal ordering exists — the 2026 "reference events that haven't occurred"
  // failure mode). SOUNDNESS: a `start_quest` effect sets a quest active bypassing offerWhen (apply.ts), so
  // a cycle is only unsatisfiable if NO quest in it is start_quest-reachable. Edges are "hard" only on an
  // all-path of offerWhen (under `any` the prereq is optional, under `not` it is an anti-requisite). Warn
  // (subset-safe: a start_quest could live in a not-yet-loaded pack — like the SPEC-60/70/105 warnings).
  const startable = new Set<string>();
  const noteStartable = (effects: readonly Effect[]): void => {
    for (const e of effects) if (e.kind === "start_quest") startable.add(e.questId);
  };
  for (const s of registries.storylets.values()) noteStartable(s.effects);
  for (const quest of registries.quests.values()) {
    noteStartable(quest.onAnyComplete);
    for (const branch of quest.branches) {
      noteStartable(branch.onComplete);
      noteStartable(branch.onFail);
      for (const obj of branch.objectives) {
        if (obj.kind === "skill_check") noteStartable(obj.onFail);
      }
    }
  }
  const collectHardPrereqs = (cond: Condition, into: Set<string>): void => {
    if (cond.kind === "quest_completed") into.add(cond.questId);
    else if (cond.kind === "all") cond.of.forEach((c) => collectHardPrereqs(c, into));
    // `any` (optional) and `not` (anti-requisite) and leaf conditions are not hard prerequisites.
  };
  const prereq = new Map<string, Set<string>>();
  for (const quest of registries.quests.values()) {
    const into = new Set<string>();
    quest.offerWhen.forEach((c) => collectHardPrereqs(c, into));
    prereq.set(quest.id, into);
  }
  // 3-colour DFS: a back-edge to a GRAY node is a cycle; report it if no member is start_quest-reachable.
  const color = new Map<string, 0 | 1 | 2>(); // 0 white, 1 gray, 2 black
  const path: string[] = [];
  const reported = new Set<string>();
  const visit = (u: string): void => {
    color.set(u, 1);
    path.push(u);
    for (const v of prereq.get(u) ?? []) {
      if (!prereq.has(v)) continue; // dangling quest ref — integrity.ts already errors on it
      const c = color.get(v) ?? 0;
      if (c === 1) {
        const cycle = path.slice(path.indexOf(v));
        const key = [...cycle].sort().join("|");
        if (!reported.has(key) && !cycle.some((q) => startable.has(q))) {
          reported.add(key);
          warnings.push(
            `quest-offer prerequisite cycle: ${cycle.join(" → ")} → ${v} — these quests gate each other's offer via quest_completed and none is start_quest-reachable, so none can ever be offered.`,
          );
        }
      } else if (c === 0) {
        visit(v);
      }
    }
    path.pop();
    color.set(u, 2);
  };
  for (const id of prereq.keys()) {
    if ((color.get(id) ?? 0) === 0) visit(id);
  }

  return { errors, warnings };
}
