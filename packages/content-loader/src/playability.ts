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
 *   - no `flag_is` gate reads a flag that nothing sets (unsatisfiable — content can't trigger — warned, SPEC-70).
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
  for (const d of registries.dialogues.values()) for (const v of d.declaredVars) setFlags.add(`flag.${v}`);
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

  return { errors, warnings };
}
