import { z } from "zod";

/**
 * Canon assertions (CONTENT_PIPELINE.md §6, the deferred "structured assertions a check can
 * query"). Where the canon INDEX only stops you reusing an *identifier*, the assertion GRAPH
 * stores facts as subject → predicate → (object | status state) so a check can catch *semantic*
 * contradictions: a patron asserted broke who also funds a faction; an NPC asserted dead who
 * still walks the world; allies who are also enemies.
 *
 * Additive and ENGINE-IGNORED (SCHEMA.md §10): the simulation never reads `assertions`; only
 * the offline canon audit does. `status` carries an optional `since` epoch so a status can
 * legitimately change over time (alive then dead) without tripping the exclusivity check.
 */

/** Any entity id can be an assertion subject/object; the audit resolves it against the registries. */
export const ENTITY_REF_RE = /^(npc|faction|location|item|quest)\.[a-z0-9_]+(\.[a-z0-9_]+)*$/;
export const EntityRef = z
  .string()
  .regex(ENTITY_REF_RE, 'expected an entity id like "npc.varga" or "faction.varga_crew"');
export type EntityRef = z.infer<typeof EntityRef>;

/** Status states; the audit partitions these into mutually-exclusive groups (life, solvency). */
export const CanonStatus = z.enum(["alive", "dead", "missing", "broke", "solvent", "wealthy"]);
export type CanonStatus = z.infer<typeof CanonStatus>;

export const CanonAssertion = z.discriminatedUnion("predicate", [
  z.object({ predicate: z.literal("member_of"), subject: EntityRef, object: EntityRef }),
  z.object({ predicate: z.literal("allied_with"), subject: EntityRef, object: EntityRef }),
  z.object({ predicate: z.literal("enemy_of"), subject: EntityRef, object: EntityRef }),
  z.object({ predicate: z.literal("funds"), subject: EntityRef, object: EntityRef }),
  z.object({ predicate: z.literal("located_in"), subject: EntityRef, object: EntityRef }),
  z.object({
    predicate: z.literal("status"),
    subject: EntityRef,
    state: CanonStatus,
    since: z.number().int().nonnegative().optional(),
  }),
  // free-text canon note: recorded for provenance / blast-radius, never machine-checked
  z.object({ predicate: z.literal("fact"), subject: EntityRef, note: z.string().max(240) }),
]);
export type CanonAssertion = z.infer<typeof CanonAssertion>;
