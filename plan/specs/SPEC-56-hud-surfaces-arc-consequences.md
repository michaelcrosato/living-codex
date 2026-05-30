# SPEC-56 — Surface the Syndicate/rival arc consequences in the HUD (+ first HUD test)

**Wave:** Cycle-7 / C7-P0 (UX consistency + a real test gap). **Risk:** LOW (additive conditional lines in
`hud.ts`; no engine/content/schema change). Reversible.

## Description + Impact
The text HUD already reflects *some* "world remembers" consequences as journal lines (`flag.has_drive`,
`flag.entered_peacefully`, `flag.entered_unseen`, `flag.syndicate_marked`) — but the major choices added this
session (SPEC-50/52/54/55) surface **nothing**: a player can sell the drive, betray Varga, learn the
Syndicate's secret, or throw in with the rival and the HUD never acknowledges it. That's an inconsistency the
new content introduced — the engine *remembers* (reactions/storylets fire) but the player-facing journal
doesn't *show* it. This extends the existing flag-line block with the arc's decisive consequences, in the
same minimal style.

It also adds `hud.spec.ts` — **`renderHud` currently has no test at all**. So this both closes the UX gap and
fills a genuine coverage gap on the presentation layer.

## Files (in scope)
- `packages/app-web/src/hud.ts` (extend the conditional flag-line block).
- `packages/app-web/test/hud.spec.ts` (new — first test for `renderHud`).

## Out of scope
- Making the consequence list data-driven (flag→line as content metadata) — a larger refactor; the existing
  pattern is a curated hardcoded list and GOAL §3 says don't over-engineer. (Note it in BACKLOG.)
- Surfacing meta/internal flags (`syndicate_resolved`, `bark_*_seen`) — not player-meaningful as lines.
- Any change to the quest/reaction/storylet lines already rendered.

## Design — add to the flag block (only when set; matches the existing icon+short-line style)
- `flag.sold_drive` → "✗ You sold the drive to the Syndicate."
- `flag.knows_syndicate_secret` → "✓ You know what's on the drive."
- `flag.leveraged_syndicate` → "⚠ You're holding the drive over the Syndicate."
- `flag.sided_with_kestrel` → "· You threw in with Kestrel."
- `flag.refused_kestrel` → "· You stayed loyal to Varga."

## DoD + Acceptance
- [ ] Each line renders in `el.textContent` iff its flag is `true`; absent otherwise.
- [ ] `hud.spec.ts`: a clean world renders location + (no consequence lines); a world with each arc flag set
      renders the matching line; the pre-existing lines (`has_drive`, entry-method, `syndicate_marked`) and
      the quest line still render. (Uses a minimal fake `Registries` + `createWorld` + a fake element with a
      `textContent` setter — no DOM dependency beyond an `{ textContent: "" }` stand-in typed as HTMLElement.)
- [ ] `pnpm verify` green; test count rises. Production build green; `pnpm e2e` 4 passed (the cold-open HUD
      assertions — "Ashfall Street", "»" — are unaffected; the new lines need flags not set at cold open).
- [ ] Golden untouched; `pnpm audit` clean.

## Test strategy
`renderHud` takes `(el, world, registries, bark?)` and writes `el.textContent`. Test with a stub element
(`{ textContent: "" } as unknown as HTMLElement`), an empty `Registries` (Maps), and a `World` built via
`createWorld` + `applyEvent SetFlag` for each consequence; assert substrings in `el.textContent`. This is the
first `renderHud` test and pins the consequence-journal contract going forward.
