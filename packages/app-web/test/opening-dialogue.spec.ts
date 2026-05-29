import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { DialogueId } from "@codex/content-schema";
import { InkNarrative } from "@codex/narrative-ink";

const opening = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const { registries } = loadPacks([opening]);
const narrative = new InkNarrative();
const open = (id: string) => narrative.load(registries.dialogues.get(DialogueId.parse(id))!.compiled);

describe("hand-authored opening dialogues are real, playable Ink (S2.2)", () => {
  it("the stranger sets met_stranger and points you to Varga", () => {
    const s = open("dialogue.stranger");
    const frame = s.current();
    expect(s.getVar("met_stranger")).toBe(true);
    expect(frame.text.toLowerCase()).toContain("varga");
    expect(frame.choices.length).toBe(2);
  });

  it("Varga offers the job; accepting sets met_varga + accepted", () => {
    const s = open("dialogue.varga_intro");
    const frame = s.current();
    expect(s.getVar("met_varga")).toBe(true);
    expect(frame.text.toLowerCase()).toContain("warehouse");
    s.choose(0); // "I'll do it"
    s.current();
    expect(s.getVar("accepted")).toBe(true);
  });

  it("the guard presents the talk / sneak / force / leave choices", () => {
    expect(open("dialogue.guard").current().choices.length).toBe(4);
  });
});
