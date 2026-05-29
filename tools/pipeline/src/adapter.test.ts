import { describe, it, expect } from "vitest";
import { z } from "zod";
import { generateStructured, StructuredGenerationError } from "./llm/adapter";
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
