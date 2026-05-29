import { test, expect } from "@playwright/test";

/**
 * Dynamic dialogue accessibility (SPEC-09): opening a conversation moves focus to a real choice
 * <button>, and Esc closes the modal and tears down the choices (restoring focus away from them).
 * Navigation-based (walks to the nearest NPC), so it lives in the non-blocking e2e suite.
 */
interface W {
  __codex: {
    world: () => {
      entities: Record<string, { id: string; pos: { x: number; y: number }; alive: boolean }>;
    };
  };
}

test("opening a dialogue focuses a choice button; Esc restores focus", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => "__codex" in window); // app fully wired
  await page.keyboard.press("Space"); // dismiss cold open
  await expect(page.locator("#cold-open")).toBeHidden();

  // walk to the nearest NPC, then talk (E)
  const npc = await page.evaluate(() => {
    const w = (window as unknown as W).__codex.world();
    const me = w.entities["entity.player"]!.pos;
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    for (const e of Object.values(w.entities)) {
      if (e.id === "entity.player" || !e.alive) continue;
      const d = (e.pos.x - me.x) ** 2 + (e.pos.y - me.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { x: e.pos.x, y: e.pos.y };
      }
    }
    return best;
  });
  expect(npc).not.toBeNull();

  for (let i = 0; i < 60; i++) {
    const me = await page.evaluate(
      () => (window as unknown as W).__codex.world().entities["entity.player"]!.pos,
    );
    const dx = npc!.x - me.x;
    const dy = npc!.y - me.y;
    if (dx * dx + dy * dy <= 28 * 28) break;
    const keys: string[] = [];
    if (dx > 6) keys.push("d");
    else if (dx < -6) keys.push("a");
    if (dy > 6) keys.push("s");
    else if (dy < -6) keys.push("w");
    for (const k of keys) await page.keyboard.down(k);
    await page.waitForTimeout(80);
    for (const k of keys) await page.keyboard.up(k);
  }

  await page.keyboard.press("e");
  const dialog = page.locator("#dialogue");
  await expect(dialog).toHaveAttribute("aria-hidden", "false", { timeout: 5000 });

  // a choice button exists and is focused
  await expect(page.locator("#dialogue-choices button").first()).toBeFocused();

  // Esc closes the panel and tears down the choice buttons
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveAttribute("aria-hidden", "true");
  expect(await page.locator("#dialogue-choices button").count()).toBe(0);
});
