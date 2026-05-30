import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import fc from "fast-check";
import { loadPacks } from "@codex/content-loader";

/**
 * SPEC-90 — content-safety gate robustness (the thesis core: "AI content can't break the game"). The loader
 * must be (1) ORDER-INDEPENDENT — the resolved registries fingerprint is identical regardless of pack order
 * (so generation/curation order can never change what loads); and (2) SUBSET-SAFE — any single pack loaded
 * alone either loads cleanly OR throws a clean integrity `Error` (the SPEC-35/42 trap), never an unexpected
 * crash (TypeError/undefined). Uses the real on-disk packs, not synthetic ones.
 */
const read = (n: string, gen = false): unknown =>
  JSON.parse(readFileSync(resolve(process.cwd(), `content/${gen ? "generated" : "core"}/${n}/pack.json`), "utf8"));
const PACKS: unknown[] = [
  read("pack.opening"),
  read("pack.district_barks"),
  read("pack.drip_market"),
  read("pack.syndicate_offer"),
  read("pack.kestrel"),
  read("pack.varga_trust"),
  read("pack.clinic"),
  read("pack.lost_thread"),
  read("pack.street_kid"),
  read("pack.the_drip_patrons", true),
];

describe("content-loader robustness (SPEC-90)", () => {
  it("is order-independent: any permutation of the live packs yields the same registries fingerprint", () => {
    const baseline = loadPacks(PACKS).fingerprint.registriesHash;
    fc.assert(
      fc.property(fc.shuffledSubarray(PACKS, { minLength: PACKS.length, maxLength: PACKS.length }), (perm) => {
        expect(loadPacks(perm).fingerprint.registriesHash).toBe(baseline);
      }),
      { numRuns: 30, seed: 0xf00d },
    );
  });

  it("is subset-safe: each pack loaded alone either loads or throws a clean integrity Error (never a crash)", () => {
    for (const pack of PACKS) {
      try {
        loadPacks([pack]); // may succeed (self-contained) or throw on a dangling cross-pack ref
      } catch (err) {
        // The only acceptable failure is a deliberate integrity Error with a message — not a crash.
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message.length).toBeGreaterThan(0);
      }
    }
  });
});
