import { test, expect } from "@playwright/test";

/**
 * Accessibility scaffolding for the text-first UI (SPEC-09). Asserts the dialogue panel's ARIA
 * modal contract (a polite live region + a focusable choice group) and that the dyslexia-friendly
 * font toggle is operable. The dynamic focus-trap / Esc-restore behavior lives in DialogueView and
 * is exercised once a conversation is open.
 */
test("the dialogue panel exposes an accessible modal contract", async ({ page }) => {
  await page.goto("/");
  const dialog = page.locator("#dialogue");
  await expect(dialog).toHaveAttribute("role", "dialog");
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog).toHaveAttribute("aria-hidden", "true"); // hidden until a conversation opens
  await expect(dialog).toHaveAttribute("aria-labelledby", "dialogue-speaker");
  await expect(page.locator("#dialogue-text")).toHaveAttribute("aria-live", "polite");
  await expect(page.locator("#dialogue-choices")).toHaveAttribute("role", "group");
});

test("the dyslexia-friendly font toggle is operable and reflects state", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => "__codex" in window); // app fully wired (handlers attached)
  await page.keyboard.press("Space"); // dismiss the cold-open overlay so controls are clickable
  await expect(page.locator("#cold-open")).toBeHidden();
  const toggle = page.locator("#font-toggle");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("body")).toHaveClass(/dyslexia/);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("body")).not.toHaveClass(/dyslexia/);
});
