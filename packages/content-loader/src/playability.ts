import type { Effect, Objective, Quest } from "@codex/content-schema";
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
 *   - every quest has ≥1 branch whose objectives are individually satisfiable in principle;
 *   - every `reach` target is connected to the location graph (no island locations);
 *   - every `unlock_exit` effect's exitIndex is within the target location's exits array (the loader
 *     checks the location id exists, but NOT that the index is in range);
 *   - no quest has directly contradictory `flag_is` gates in `offerWhen` (it could never be offered);
 *   - no storylet has unsatisfiable preconditions (it could never fire); always-on noise is warned.
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
        return registries.npcs.has(obj.npcId);
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

  return { errors, warnings };
}
