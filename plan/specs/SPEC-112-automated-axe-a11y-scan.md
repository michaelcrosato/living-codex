# SPEC-112 — Automated WCAG scanning (axe-core) in the e2e a11y suite

**Wave:** Cycle-11 P0 (a11y regression net) · **Risk:** LOW · **Status:** Todo

## Description + Impact

The repo has **targeted, hand-written** a11y assertions (ARIA modal contract, focus-trap/Esc-restore,
font toggle, screen-reader announcer, WCAG contrast math, use-of-color — SPEC-09/81–85). What it lacks
is **automated, comprehensive WCAG scanning**: the manual specs only check what they explicitly assert,
so a new a11y violation introduced elsewhere (a missing label, a contrast regression, a bad ARIA
attribute, a duplicate id) ships unnoticed. `@axe-core/playwright` is the 2026 standard — it runs the
axe-core ruleset against the live rendered page and reports WCAG 2.1 A/AA violations.

Impact: a comprehensive a11y regression net over the actual rendered app, complementing the targeted
specs. Either it confirms the app is WCAG-clean (a durable guard) or it surfaces real violations to fix.

## Approach (files / patterns)

- `@axe-core/playwright` added as a root dev-dependency (done).
- New `packages/app-web/e2e/axe.spec.ts`: boot `/`, wait for `__codex` wired, dismiss the cold-open
  overlay (Space), run `new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"])`
  and assert **zero serious/critical violations** on the main game view. Add a second scan with a
  dialogue open if reachable headlessly; otherwise scan the boot view + the HUD.
- The `<canvas>` Pixi surface carries no DOM text — exclude it from rules that don't apply to a game
  canvas only if axe false-positives on it (document any exclusion with the rule id + rationale).
- e2e is not in `pnpm verify` (runs via `pnpm e2e`); this adds to that suite (CI runs it separately).

## DoD + acceptance

- [ ] `pnpm e2e` includes an axe scan that passes with **zero serious/critical** WCAG 2.1 A/AA
      violations on the main view (any genuine violations found are FIXED; any excluded rule is
      documented with id + rationale).
- [ ] `pnpm verify` EXIT 0 (lockfile change reproducible: `pnpm install --frozen-lockfile` succeeds).
- [ ] `pnpm audit` clean after the dep add; golden untouched (no engine/content change).

## Test strategy

The axe scan IS the test. Run it; triage findings (fix genuine, document excluded). Confirm
`--frozen-lockfile` install still works (the new dep is in the lockfile).
