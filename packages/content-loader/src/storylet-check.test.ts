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

  it("flags a flag required to equal two different values", () => {
    expect(unsatisfiablePreconditions([flagTrue("flag.a"), flagFalse("flag.a")])).toMatch(
      /flag\.a/,
    );
  });

  it("flags a condition together with its direct negation (both orders)", () => {
    expect(unsatisfiablePreconditions([flagTrue("flag.x"), not(flagTrue("flag.x"))])).toMatch(
      /flag\.x/,
    );
    expect(unsatisfiablePreconditions([not(flagTrue("flag.y")), flagTrue("flag.y")])).toMatch(
      /flag\.y/,
    );
  });

  it("flattens nested `all` conjunctions", () => {
    const nested: Condition = { kind: "all", of: [flagFalse("flag.a")] };
    expect(unsatisfiablePreconditions([flagTrue("flag.a"), nested])).toMatch(/flag\.a/);
  });

  it("does not false-positive across `any` (deliberately out of scope)", () => {
    const either: Condition = { kind: "any", of: [flagTrue("flag.a"), flagFalse("flag.a")] };
    expect(unsatisfiablePreconditions([either])).toBeNull();
  });
});
