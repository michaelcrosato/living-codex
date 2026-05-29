# SPEC-09 — Accessibility pass (text-first a11y)

- **Status:** Todo · **Pillar:** Player Experience · **Wave:** 2 · **Priority:** P=11
- **I**=5 **F**=3 **R**=2 **Ft**=5 · **Highest player value** — our product *is* rich text.

## Description
The game is "rich text + simple vector," which makes accessibility unusually high-leverage and unusually
achievable: if dialogue/log/choices are real DOM (not canvas-painted text), the accessibility tree mostly
"just works." Do the prioritized wins from research. (Sources: [Accessible WebGL](https://annekagoss.medium.com/accessible-webgl-43d15f9caa21),
[MDN ARIA SR guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Screen_Reader_Implementors_Guide),
[WCAG C39 reduced-motion](https://www.w3.org/WAI/WCAG21/Techniques/css/C39).)

## Acceptance Criteria
1. **DOM-mirrored narrative:** dialogue text, NPC name, ambient/log lines, and choices are rendered as real
   DOM elements (not text drawn into the Pixi canvas). If any narrative text is currently canvas-painted, mirror
   it to a visually-aligned-or-offscreen DOM node.
2. **Live region:** the dialogue/log container is `role="log"` `aria-live="polite"`, updates only when content
   changes, and includes the speaker label so a screen reader announces "Varga: …".
3. **Keyboard-only play:** choices are focusable native controls (buttons/`role` + `tabindex`), operable with
   Tab/Arrow/Enter; `Esc` closes the dialogue (already a binding — keep); **focus is trapped** inside the modal
   dialogue and **restored** to the prior element on close.
4. **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables non-essential animation (camera ease,
   text reveal); any auto-advancing motion has a pause/stop affordance (WCAG 2.2.2).
5. **Readable type:** dialogue/body text meets ≥4.5:1 contrast, line-height ≥1.5, comfortable measure; the page
   survives 200% zoom without loss; expose a **user toggle** for a dyslexia-friendly font (don't force it).
6. `engine-core` stays pure (this is entirely `app-web`/DOM/CSS). `pnpm verify` green; `pnpm e2e` green.

## Implementation approach
Read `packages/app-web/src/dialogue-controller.ts`, `hud.ts`, `main.ts`, `index.html`, and the dialogue
Playwright spec. Ensure choices/log live in an accessible DOM panel layered over the canvas. Add a small focus-
trap utility (or a `<dialog>` element) + focus save/restore. Add ARIA attributes + CSS (contrast, line-height,
reduced-motion media query, a `body.dyslexia-font` class toggled by a HUD control). Extend the Playwright walk
to assert the live region and focusable choices exist and are keyboard-reachable.

## Files
- `packages/app-web/src/dialogue-controller.ts`, `hud.ts`, `main.ts`, `index.html`, app CSS, and a Playwright
  spec under `packages/app-web/test/`. **Collision:** `main.ts` shared with SPEC-08/SPEC-10 — sequence.

## Dependencies / prereqs
None hard. Coordinate `main.ts` edits with SPEC-08/SPEC-10.

## Test strategy
Playwright (chromium): dialogue panel is in the a11y tree, choices are focusable & Enter-activatable, Esc
restores focus, `prefers-reduced-motion` honored. JSDOM unit test for the focus-trap util. **Manually run the
UI** and tab through a conversation. **Honestly document** what was not machine-verified (real screen-reader
output across NVDA/VoiceOver).

## Effort
M (~3 hr; UI + e2e).

## Out of scope
Full WCAG 2.2 AA audit/certification; the experimental HTML-in-Canvas API (BACKLOG); localization; audio
descriptions (AudioOut is still a stub).
