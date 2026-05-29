# SPEC-13 — Grow the world: a new curated pack via the offline cycle

- **Status:** Todo · **Pillar:** Pipeline (offline) / Content depth · **Wave:** 2 · **Priority:** P=11
- **I**=4 **F**=4 **R**=2 **Ft**=5

## Description
Add genuine content depth **and** re-prove Pipeline B's central claim (generated content loads through the
*exact same path* as hand-authored). Author a new pack that grounds in existing canon — the canonical example
brief is **"a rival fixer who competes with Varga for the player's loyalty"** (CONTENT_PIPELINE §5;
WORLD_BIBLE B closing note) — with a branching intro quest (≥3 viable solutions) and a few NPCs. Produce it
through the **offline cycle with StubProvider** (unattended-safe) or hand-curate the cycle's output; never call
a paid API unattended.

## Acceptance Criteria
- A new pack (preferred: `content/generated/pack.<name>/pack.json` to exercise the generated path; carries full
  `provenance`) that **`pnpm content:validate`** and **`pnpm content:verify`** both pass: schema-valid, all
  cross-pack refs resolve, the new quest is solvable + reachable, all `unlock_exit` indices in range, and the
  **canon assertion graph is contradiction-free** (declare honest `assertions`; respect blast-radius across
  `pack.opening`).
- The intro quest has **≥3 branches** (e.g. talk / sneak-or-leverage / force) that reach distinct consequences,
  expressed as data (conditions + effects), no engine change.
- NPC dialogues authored in Ink under the pack's `ink/`, compiled via `pnpm content:compile-ink`, and **play
  through the existing `InkNarrative` path** — zero engine special-casing.
- A test (mirroring `app-web/test/generated-content.spec.ts`) loads the new pack **alongside** the existing
  packs into one registry; hand-authored and generated NPCs are indistinguishable; faction refs resolve in one
  integrity pass.
- `dependsOn` declares its canon dependencies (e.g. `pack.opening`). Content counts in
  `content:validate` output increase accordingly. `pnpm verify` green.
- If `runCycle` output is used directly, update the **golden-master** hash deliberately and note it; if the pack
  is curated/hand-finished, the golden test is unaffected.

## Implementation approach
Read `docs/WORLD_BIBLE.md` (canon to honor), `docs/CONTENT_PIPELINE.md §4–§6`, `tools/pipeline/src/pipelines/cycle.ts`,
`synthesis.ts`, `bake.ts`, and an existing pack (`content/generated/pack.the_drip_patrons/pack.json`) for shape.
Either: (a) `pnpm content:new <name> --generated` to scaffold, then author NPCs/quest/Ink + assertions and
compile Ink; or (b) run `pnpm pipeline:cycle --brief "rival fixer…"` (StubProvider), curate the candidate via
the review page, then `pnpm pipeline:bake`. Ground every entity in the canon index; condition only on **Possible
Outcomes**, never one player's branch (WORLD_BIBLE A.3).

## Files
- `content/generated/pack.<name>/pack.json` + `…/ink/*.ink` (new). A new `app-web/test/*.spec.ts`. Possibly the
  pipeline fixture/scripts if generating. **Collision:** schema/golden files if using raw `runCycle` — coordinate
  with SPEC-16/SPEC-11.

## Dependencies / prereqs
Offline-safe (StubProvider). **Real multi-model generation is BLOCKED on `OPENROUTER_API_KEY` (paid)** — do not
attempt unattended; the stub/curated path satisfies this spec.

## Test strategy
`content:validate` + `content:verify` clean; the same-path load test; an Ink playthrough assertion. Plant a
deliberate canon contradiction locally to confirm `content:verify` *would* catch it, then remove it.

## Effort
M (~3 hr authoring/curation).

## Out of scope
Real paid generation; a whole new district/biome (BACKLOG — bigger); new engine verbs (only if the content
genuinely needs one → its own Recipe-1 spec, not this one).
