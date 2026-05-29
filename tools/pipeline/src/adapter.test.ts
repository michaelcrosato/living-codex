import { describe, it, expect } from "vitest";
import { z } from "zod";
import { generateStructured, StructuredGenerationError, tolerantParse } from "./llm/adapter";
import { StubProvider } from "./llm/stub";

const Shape = z.object({ name: z.string(), level: z.number().int().min(1).max(5) });

describe("generateStructured (provider-agnostic, validated, self-repairing)", () => {
  it("returns parsed, schema-valid output from a provider", async () => {
    const provider = new StubProvider(() => '{"name":"Varga","level":3}');
    const out = await generateStructured(provider, Shape, { system: "x", user: "y" });
    expect(out).toEqual({ name: "Varga", level: 3 });
  });

  it("strips code fences before parsing", async () => {
    const provider = new StubProvider(() => '```json\n{"name":"V","level":1}\n```');
    expect(await generateStructured(provider, Shape, { system: "x", user: "y" })).toEqual({
      name: "V",
      level: 1,
    });
  });

  it("recovers messy-but-valid output on the FIRST attempt (no repair spent)", async () => {
    let calls = 0;
    const provider = new StubProvider(() => {
      calls++;
      return 'Sure, here you go:\n```json\n{"name":"V","level":2,}\n```'; // prose + fence + trailing comma
    });
    const out = await generateStructured(provider, Shape, { system: "x", user: "y" });
    expect(out).toEqual({ name: "V", level: 2 });
    expect(calls).toBe(1); // tolerant pre-parse avoided an expensive re-prompt
  });

  it("auto-repairs: re-prompts after a bad output, succeeds on the retry", async () => {
    let call = 0;
    const provider = new StubProvider(() =>
      call++ === 0 ? "{ not json" : '{"name":"V","level":2}',
    );
    const out = await generateStructured(provider, Shape, {
      system: "x",
      user: "y",
      repairAttempts: 1,
    });
    expect(out.level).toBe(2);
    expect(call).toBe(2);
  });

  it("throws StructuredGenerationError after exhausting repair attempts", async () => {
    const provider = new StubProvider(() => '{"name":"V","level":99}'); // out of range, always
    await expect(
      generateStructured(provider, Shape, { system: "x", user: "y", repairAttempts: 1 }),
    ).rejects.toBeInstanceOf(StructuredGenerationError);
  });
});

describe("tolerantParse (recover JSON without a repair round)", () => {
  it("parses clean JSON", () => {
    expect(tolerantParse('{"a":1}')).toEqual({ a: 1 });
  });
  it("recovers JSON wrapped in chain-of-thought prose", () => {
    expect(tolerantParse('Here is the result:\n{"a":1, "b":"x"}\nHope that helps!')).toEqual({
      a: 1,
      b: "x",
    });
  });
  it("recovers fenced JSON", () => {
    expect(tolerantParse("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });
  it("recovers JSON with trailing commas", () => {
    expect(tolerantParse('{"a":1,"b":[1,2,],}')).toEqual({ a: 1, b: [1, 2] });
  });
  it("does not corrupt a string that contains a comma-brace sequence", () => {
    expect(tolerantParse('{"a":"x,}"}')).toEqual({ a: "x,}" });
  });
  it("throws when no JSON value is recoverable", () => {
    expect(() => tolerantParse("totally not json at all")).toThrow();
  });
});
