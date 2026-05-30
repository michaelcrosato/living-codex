import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * SPEC-112 — automated WCAG scanning. Complements the targeted manual a11y specs (SPEC-09/81–85) with
 * a comprehensive axe-core ruleset pass over the live rendered app, so a11y regressions the hand-written
 * assertions don't cover (missing labels, contrast drift, bad ARIA, duplicate ids) fail CI. We gate on
 * serious/critical WCAG 2.1 A/AA violations (the actionable severities).
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function boot(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(() => "__codex" in window); // app fully wired
  await page.keyboard.press("Space"); // dismiss the cold-open overlay
  await expect(page.locator("#cold-open")).toBeHidden();
}

test("the main game view has no serious or critical WCAG violations", async ({ page }) => {
  await boot(page);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  // Surface a readable summary on failure (id + help + node count).
  expect(
    serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
  ).toEqual([]);
});
