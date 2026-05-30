# SPEC-109 — Harden the curation-page HTML escaper (XSS defense-in-depth + pin it)

**Wave:** Cycle-10 P0 (security boundary) · **Risk:** LOW · **Status:** Todo

## Description + Impact

`renderBundleHtml` (`tools/pipeline/src/bundle.ts`) builds the **human curation-review page** — a static
HTML page a reviewer **opens in a browser** to accept/edit/reject AI-generated content (the
human-in-the-loop gate, CONTENT_PIPELINE §2). It is therefore an **XSS boundary**: a buggy/adversarial
generated pack must not be able to inject markup/script into the reviewer's browser. The defense is the
`esc()` helper applied to every authored/AI field (rationale, npc name/role, quest title, premise,
beats, notes, flagged strings, ids).

Two gaps:
1. **`esc()` does not escape `'` (apostrophe).** It handles `& < > "` but not `'`. The current template
   uses only double-quoted attributes, so this isn't an *active* hole today — but it's a latent
   defense-in-depth failure: the instant anyone adds a single-quoted attribute, AI content containing
   `'` could break out. A correct HTML escaper is safe under **any** attribute-quoting style.
2. **The escaping is under-pinned** — the only test asserts `<`/`>` (`&lt;script&gt;`); `&`, `"`, and
   `'` are unverified. This is why `bundle.ts` carries the repo's most mutation survivors (each `esc()`
   `.replace` is deletable with no test failing). The XSS boundary is the one place that warrants pinning.

Impact: the curation page is robustly escaped regardless of future template edits, and the boundary is
verified char-by-char.

## Approach (files / patterns)

- `tools/pipeline/src/bundle.ts`: add `.replace(/'/g, "&#39;")` to `esc()` (after the `"` replace; `&`
  must stay first so it isn't double-escaped — it already is).
- `tools/pipeline/src/authoring.test.ts`: extend the escaping test (or add a focused unit) to assert all
  five: `&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;`, `"`→`&quot;`, `'`→`&#39;`, and that no raw injected markup
  survives. A single authored field carrying all five chars is sufficient.

## DoD + acceptance

- [ ] `esc()` escapes `& < > " '`; `&` is replaced first (no double-escape).
- [ ] Test asserts each of the five chars maps to its entity and that raw `<script>`/attribute-breakout
      markup does not appear.
- [ ] `pnpm verify` EXIT 0; a focused `stryker run --mutate bundle.ts` shows the `esc()` replace mutants
      killed (the targeted improvement; bundle.ts overall stays report-only).
- [ ] golden untouched (StubProvider path unaffected — esc adds an entity only when `'` present, and the
      demo fixture text has none; confirm fingerprint/golden unchanged); `pnpm audit` clean.

## Test strategy

Unit: feed `renderBundleHtml` a bundle whose authored text contains `& < > " '` and a `<script>` and an
attribute-breakout attempt; assert the entities appear and the raw dangerous forms do not. Re-run the
focused mutation to confirm the `esc()` cluster is killed.
