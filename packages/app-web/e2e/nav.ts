import { expect, type Page } from "@playwright/test";

/** Shape of the `__codex.world()` debug hook the app exposes for e2e navigation. */
interface CodexWindow {
  __codex: {
    world: () => {
      entities: Record<string, { id: string; pos: { x: number; y: number }; alive: boolean }>;
    };
  };
}

/**
 * Boot the app and dismiss the cold-open overlay so the live game view + controls are interactive.
 * Shared by the e2e specs (slice/a11y/axe) so the boot sequence stays in one place.
 */
export async function boot(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(() => "__codex" in window); // app fully wired
  await page.keyboard.press("Space"); // dismiss the cold-open overlay
  await expect(page.locator("#cold-open")).toBeHidden();
}

/**
 * Walk the player to the nearest living NPC and open the dialogue (press E). Deterministic, input-driven
 * (mirrors a real player), so the opened modal is the genuine rendered state to assert against. Assumes
 * `boot()` has run. Returns once the dialogue modal is open.
 */
export async function walkToNearestNpcAndTalk(page: Page): Promise<void> {
  const npc = await page.evaluate(() => {
    const w = (window as unknown as CodexWindow).__codex.world();
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
      () => (window as unknown as CodexWindow).__codex.world().entities["entity.player"]!.pos,
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
  await expect(page.locator("#dialogue")).toHaveAttribute("aria-hidden", "false", {
    timeout: 5000,
  });
}
