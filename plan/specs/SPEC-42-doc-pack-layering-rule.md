# SPEC-42 — Document the "base pack must load in isolation" layering rule

- **Status:** Done · **Pillar:** Docs / Contract · **Wave:** Cycle-6 P0 (REPLENISH doc-sync) · **Cycle:** 6

## Description & impact
SPEC-35 surfaced a real, non-obvious trap: the content loader (and several tests — notably the replay-fuzz)
run against **subsets** of packs, so referential integrity is enforced against whatever subset loads, not
the full catalog. Therefore a base pack must be **self-contained** — a location targeted by an
`exit.toLocationId` must live in the *base* pack (shared geography), with only NPCs/quests/dialogues
overlaid from a dependent pack. Putting geography in the overlay makes the base pack fail to load alone
(this exact failure broke replay-fuzz during the first SPEC-35 attempt).

The durable docs explain `dependsOn` ordering and the referential-integrity rule (`docs/SCHEMA.md`), but
**not** this subset-loading corollary — it lived only in `/plan/specs/SPEC-35` (agent working memory). For a
repo whose thesis is "AI authors content against a documented contract," an undocumented architectural trap
will bite the next author (human or agent) who adds a district. This closes the contract gap.

## DoD & acceptance
- `docs/SCHEMA.md`: a "Layering corollary" paragraph added immediately after the referential-integrity
  paragraph (its natural technical home), with the Drip Market as the worked example.
- `content/core/README.md` (the content-author entry point, previously a 4-line stub): a "Pack layering"
  section stating the practical rule + pointing to `docs/SCHEMA.md` and SPEC-35.
- `pnpm exec prettier --check` clean on both files. Docs-only — no code, no schema, no behavior change;
  `pnpm verify` path (typecheck/lint/test/deps/content/replay) is unaffected.

## Approach
Additive prose only, matching the existing single-line-paragraph style. No code touched.

## Test strategy
Prettier `--check` (the relevant gate for markdown) — clean. Real execution; reversible via git.
