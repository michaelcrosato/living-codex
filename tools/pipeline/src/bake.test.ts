import { describe, it, expect } from "vitest";
import { ContentPack } from "@codex/content-schema";
import { finalizeProvenance } from "./bake";

/**
 * SPEC-98 — the bake step (CONTENT_PIPELINE §2.6): finalizeProvenance stamps human-curation provenance
 * (curatedBy + approvedAt) onto an approved candidate and RE-VALIDATES against the treaty before it is
 * written to content/generated/. Previously untested.
 */
const candidate = ContentPack.parse({
  id: "pack.baked",
  version: "0.1.0",
  title: "Baked",
  dependsOn: ["pack.opening"],
  provenance: { authoredBy: "pipeline", models: ["stub:architect"], promptHash: "abc123" },
  factions: [],
  items: [],
  locations: [],
  npcs: [],
  dialogues: [],
  quests: [],
  storylets: [],
  assertions: [],
});

describe("bake / finalizeProvenance (SPEC-98)", () => {
  it("stamps curatedBy + approvedAt while preserving the generated content + origin provenance", () => {
    const baked = finalizeProvenance(candidate, { curatedBy: "operator", approvedAt: "2026-05-30T00:00:00.000Z" });
    expect(baked.provenance.curatedBy).toBe("operator");
    expect(baked.provenance.approvedAt).toBe("2026-05-30T00:00:00.000Z");
    expect(baked.provenance.authoredBy).toBe("pipeline"); // origin preserved
    expect(baked.provenance.models).toEqual(["stub:architect"]); // model trail preserved
    expect(baked.provenance.promptHash).toBe("abc123");
    expect(baked.id).toBe("pack.baked"); // content untouched
  });

  it("re-validates against the treaty: a non-ISO approvedAt is rejected (can't bake an invalid pack)", () => {
    expect(() => finalizeProvenance(candidate, { curatedBy: "operator", approvedAt: "yesterday" })).toThrow();
  });

  it("does not mutate the input candidate", () => {
    finalizeProvenance(candidate, { curatedBy: "operator", approvedAt: "2026-05-30T00:00:00.000Z" });
    expect(candidate.provenance.curatedBy).toBeUndefined(); // original unchanged
  });
});
