import { ContentPack, type ContentPack as Pack } from "@codex/content-schema";

/**
 * Bake (CONTENT_PIPELINE.md §2 step 6): stamp the human-curation provenance onto an approved
 * candidate and re-validate against the treaty before it is written to content/generated/.
 * SCHEMA.md §8: a generated pack records who approved it and when, so months later anyone can
 * trace how a piece of the world came to be.
 */
export interface CurationStamp {
  curatedBy: string;
  /** ISO 8601 timestamp (must satisfy z.string().datetime()). */
  approvedAt: string;
}

export function finalizeProvenance(candidate: Pack, stamp: CurationStamp): Pack {
  return ContentPack.parse({
    ...candidate,
    provenance: {
      ...candidate.provenance,
      curatedBy: stamp.curatedBy,
      approvedAt: stamp.approvedAt,
    },
  });
}
