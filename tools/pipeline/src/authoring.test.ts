import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { ContentPack } from "@codex/content-schema";
import { makeBrief } from "./brief";
import { demoProvider } from "./demo-fixture";
import { runCycle } from "./pipelines/cycle";
import { renderBundleHtml } from "./bundle";
import { scaffoldPack } from "./scaffold";

describe("scaffoldPack — the content:new skeleton (S3.4)", () => {
  it("produces a treaty-valid empty pack and normalizes the id", () => {
    const pack = scaffoldPack({ name: "my_new_pack" });
    expect(pack.id).toBe("pack.my_new_pack");
    expect(ContentPack.safeParse(pack).success).toBe(true);
    expect(pack.npcs).toEqual([]);
    expect(pack.quests).toEqual([]);
    expect(pack.provenance.authoredBy).toBe("human");
  });

  it("accepts an already-prefixed name and a custom title", () => {
    const pack = scaffoldPack({ name: "pack.foo", title: "Foo Arc" });
    expect(pack.id).toBe("pack.foo");
    expect(pack.title).toBe("Foo Arc");
  });

  it("rejects an invalid pack name (validated through the schema)", () => {
    expect(() => scaffoldPack({ name: "Bad Name!" })).toThrow();
  });
});

describe("renderBundleHtml — the static curation review page (S3.4)", () => {
  const raw = JSON.parse(
    readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
  ) as unknown;
  const { registries, fingerprint } = loadPacks([raw]);
  const run = () =>
    runCycle({
      brief: makeBrief({ intent: "Introduce a rival fixer", budget: { npcs: 1, quests: 1 } }),
      provider: demoProvider(),
      registries,
      packIds: Object.keys(fingerprint.packs),
      packId: "pack.the_rival_fixer",
    });

  it("renders a self-contained page with the candidate, scorecard, and accept/reject controls", async () => {
    const html = await run().then(renderBundleHtml);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("pack.the_rival_fixer");
    expect(html).toContain("Critic scorecard");
    expect(html).toContain("npc.rival_fixer");
    expect(html).toContain("accept");
    expect(html).toContain("reject");
  });

  it("escapes HTML in authored text so a candidate can't inject markup", async () => {
    const base = await run();
    const html = renderBundleHtml({
      ...base,
      brief: makeBrief("Intent <script>alert(1)</script>"),
      flagged: ["<b>danger</b>"],
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;b&gt;danger&lt;/b&gt;");
  });
});
