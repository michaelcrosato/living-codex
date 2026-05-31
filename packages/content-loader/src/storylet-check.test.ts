import { describe, it, expect } from "vitest";
import { FlagId, type Condition } from "@codex/content-schema";
import { unsatisfiablePreconditions } from "./storylet-check";

const fid = (s: string): FlagId => FlagId.parse(s);
const flagTrue = (f: string): Condition => ({ kind: "flag_is", flag: fid(f), equals: true });
const flagFalse = (f: string): Condition => ({ kind: "flag_is", flag: fid(f), equals: false });
const not = (of: Condition): Condition => ({ kind: "not", of });

describe("unsatisfiablePreconditions (SPEC-25 storylet static check)", () => {
  it("returns null for satisfiable conjunctions", () => {
    expect(unsatisfiablePreconditions([])).toBeNull();
    expect(unsatisfiablePreconditions([flagTrue("flag.a"), not(flagTrue("flag.b"))])).toBeNull();
    expect(
      unsatisfiablePreconditions([{ kind: "skill_at_least", skill: "sneak", value: 3 }]),
    ).toBeNull();
  });

  it("flags a flag required to equal two different values (exact reason)", () => {
    // Assert the FULL reason — the flag, BOTH conflicting values, and the phrasing — so the
    // JSON.stringify(value) interpolations and explanatory fragments are pinned, not just the name.
    expect(unsatisfiablePreconditions([flagTrue("flag.a"), flagFalse("flag.a")])).toBe(
      'flag "flag.a" must equal both false and true — never satisfiable',
    );
  });

  it("flags a condition together with its direct negation (both orders, exact reason)", () => {
    expect(unsatisfiablePreconditions([flagTrue("flag.x"), not(flagTrue("flag.x"))])).toBe(
      'flag "flag.x" must equal true and also NOT equal it — never satisfiable',
    );
    expect(unsatisfiablePreconditions([not(flagTrue("flag.y")), flagTrue("flag.y")])).toBe(
      'flag "flag.y" must equal true and also NOT equal it — never satisfiable',
    );
  });

  it("flattens nested `all` conjunctions (exact reason)", () => {
    const nested: Condition = { kind: "all", of: [flagFalse("flag.a")] };
    expect(unsatisfiablePreconditions([flagTrue("flag.a"), nested])).toBe(
      'flag "flag.a" must equal both false and true — never satisfiable',
    );
  });

  it("flattens DEEPLY nested `all` conjunctions (stack recursion through two levels)", () => {
    const deep: Condition = { kind: "all", of: [{ kind: "all", of: [flagFalse("flag.a")] }] };
    expect(unsatisfiablePreconditions([flagTrue("flag.a"), deep])).toBe(
      'flag "flag.a" must equal both false and true — never satisfiable',
    );
  });

  it("does not false-positive across `any` (deliberately out of scope)", () => {
    const either: Condition = { kind: "any", of: [flagTrue("flag.a"), flagFalse("flag.a")] };
    expect(unsatisfiablePreconditions([either])).toBeNull();
  });
});
