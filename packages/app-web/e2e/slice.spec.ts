import { test, expect } from "@playwright/test";

interface DebugWorld {
  locationId: string;
  entities: Record<string, { pos: { x: number; y: number }; alive: boolean }>;
  quests: Record<string, { status: string } | undefined>;
}
interface DebugBeats {
  metVarga: boolean;
  acceptedQuest: boolean;
  solved: boolean;
  sawConsequence: boolean;
}
declare global {
  interface Window {
    __codex: {
      world: () => DebugWorld;
      log: () => { entries: unknown[] };
      beats: () => DebugBeats;
    };
  }
}

/**
 * The "First Light" browser smoke (T-12/T-15). Walks the opening beats in a real browser:
 * cold open → dismiss → the district renders + names itself → movement moves the player →
 * the warehouse quest is live → the beat instrumentation + replay log are wired. (The full
 * three-branch solve + reactive payoff are proven deterministically by the headless suite.)
 */
test("first light plays in the browser", async ({ page }) => {
  await page.goto("/");

  // 0:00 — the cold open is up
  await expect(page.locator("#cold-open")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#cold-open")).toContainText("don't remember");

  // press any key — the street fades in
  await page.keyboard.press("Space");
  await expect(page.locator("#cold-open")).toBeHidden();
  await expect(page.locator("#hud")).toContainText("Ashfall Street");
  await expect(page.locator("canvas")).toBeVisible();

  // movement moves the player
  const playerX = (): Promise<number> =>
    page.evaluate(() => window.__codex.world().entities["entity.player"]!.pos.x);
  const before = await playerX();
  await page.keyboard.down("d");
  await page.waitForTimeout(400);
  await page.keyboard.up("d");
  expect(await playerX()).toBeGreaterThan(before);

  // the warehouse quest is live (loader + quest system + seeded flag running in the loop)
  await page.waitForFunction(
    () => window.__codex.world().quests["quest.the_warehouse"]?.status === "active",
    null,
    { timeout: 5_000 },
  );

  // beat instrumentation + replay log are wired
  expect(await page.evaluate(() => window.__codex.beats().acceptedQuest)).toBe(true);
  expect(await page.evaluate(() => window.__codex.log().entries.length)).toBeGreaterThan(0);
});
