import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPacks } from "@codex/content-loader";
import { buildCanonIndex, renderCanon } from "./canon";

const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), "content/core/pack.opening/pack.json"), "utf8"),
) as unknown;
const { registries, fingerprint } = loadPacks([raw]);

describe("canon index", () => {
  it("indexes every entity id/kind/name, sorted, with the pack list", () => {
    const index = buildCanonIndex(registries, Object.keys(fingerprint.packs));
    const ids = index.entities.map((e) => e.id);
    expect(ids).toContain("npc.varga");
    expect(ids).toContain("quest.the_warehouse");
    expect(ids).toContain("location.warehouse_floor");
    expect([...ids]).toEqual([...ids].sort()); // stable, sorted
    expect(index.packs).toEqual(["pack.opening"]);
    const varga = index.entities.find((e) => e.id === "npc.varga");
    expect(varga?.kind).toBe("npc");
  });

  it("renders compact grounding text that names ids and kinds", () => {
    const text = renderCanon(buildCanonIndex(registries));
    expect(text).toContain("npc.varga [npc]");
    expect(text).toContain("quest.the_warehouse [quest]");
  });
});
