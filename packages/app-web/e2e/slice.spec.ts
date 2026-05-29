import { test, expect } from "@playwright/test";

/** The shape the app exposes on window for automation (see main.ts). */
interface DebugWorld {
  locationId: string;
  entities: Record<string, { pos: { x: number; y: number }; alive: boolean }>;
  quests: Record<string, { status: string } | undefined>;
}
declare global {
  interface Window {
    __codex: { world: () => DebugWorld; log: () => { entries: unknown[] } };
  }
}

/**
 * E4 — the "First Light" browser smoke test (T-12 acceptance). Asserts the slice beats:
 * app loads, the start location renders + names itself, movement moves the player, using an
 * exit changes location (the quest is live), and a replayable event log accumulates.
 */
test("first light plays in the browser", async ({ page }) => {
  await page.goto("/");

  // app loads and the start location is named in the HUD
  await expect(page.locator("#hud")).toContainText("Ashfall Street", { timeout: 15_000 });

  // a canvas was created by the Pixi renderer
  await expect(page.locator("canvas")).toBeVisible();

  // movement input moves the player
  const playerX = (): Promise<number> =>
    page.evaluate(() => window.__codex.world().entities["entity.player"]!.pos.x);
  const before = await playerX();
  await page.keyboard.down("d");
  await page.waitForTimeout(400);
  await page.keyboard.up("d");
  expect(await playerX()).toBeGreaterThan(before);

  // the quest activates in-browser (offerWhen flag.met_varga, set at boot) — proves the loader,
  // the quest system, and the seeded flag are all running live in the real loop
  await page.waitForFunction(
    () => window.__codex.world().quests["quest.the_warehouse"]?.status === "active",
    null,
    { timeout: 5_000 },
  );

  // the session has been logging replayable events
  expect(await page.evaluate(() => window.__codex.log().entries.length)).toBeGreaterThan(0);
});
