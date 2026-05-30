import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { boot, walkToNearestNpcAndTalk } from "./nav";

/**
 * SPEC-112/114 — automated WCAG scanning. Complements the targeted manual a11y specs (SPEC-09/81–85) with
 * a comprehensive axe-core ruleset pass over the live rendered app, so a11y regressions the hand-written
 * assertions don't cover (missing labels, contrast drift, bad ARIA, duplicate ids) fail CI. We gate on
 * serious/critical WCAG 2.1 A/AA violations (the actionable severities) on both the main view and — the
 * richest interactive surface — the open dialogue modal (SPEC-114).
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** Serious/critical WCAG 2.1 A/AA violations on the current page state, as a readable id/impact summary. */
async function seriousViolations(
  page: import("@playwright/test").Page,
): Promise<Array<{ id: string; impact: string | null | undefined; nodes: number; help: string }>> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
}

test("the main game view has no serious or critical WCAG violations", async ({ page }) => {
  await boot(page);
  expect(await seriousViolations(page)).toEqual([]);
});

test("the open dialogue modal has no serious or critical WCAG violations", async ({ page }) => {
  await boot(page);
  await walkToNearestNpcAndTalk(page); // opens the dialogue modal (SPEC-09's ARIA surface)
  await expect(page.locator("#dialogue-choices button").first()).toBeFocused();
  expect(await seriousViolations(page)).toEqual([]);
});
