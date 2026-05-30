import { describe, it, expect } from "vitest";
import { validatePack } from "./validate";

/**
 * SPEC-102 — validatePack is the content-safety layer's readable rejection of bad content (when AI/authored
 * output fails the schema, the error must name WHERE + WHY). The success path is exercised by load.test; this
 * pins the FAILURE path (the readable error built from Zod issues + the label), previously uncovered.
 */
const valid = {
  id: "pack.ok",
  version: "0.1.0",
  title: "OK",
  dependsOn: [],
  provenance: { authoredBy: "human" },
};

describe("validatePack (SPEC-102)", () => {
  it("returns the parsed pack on valid input", () => {
    expect(validatePack(valid).id).toBe("pack.ok");
  });

  it("throws a readable error naming the label + the offending field path/message", () => {
    const bad = { ...valid, id: "not-a-pack-id" }; // id must match /^pack\.[a-z0-9_]+$/
    expect(() => validatePack(bad, "pack.bad")).toThrow(/pack\.bad failed schema validation/);
    expect(() => validatePack(bad, "pack.bad")).toThrow(/\bid\b/); // names the offending field
  });

  it("falls back to '(unknown)' when no label is given", () => {
    expect(() => validatePack({ nope: true })).toThrow(/Content pack \(unknown\) failed schema validation/);
  });

  it("uses '(root)' for a top-level (pathless) issue", () => {
    // a non-object raw -> the issue path is empty -> rendered as (root)
    expect(() => validatePack(42, "pack.x")).toThrow(/\(root\)/);
  });
});
