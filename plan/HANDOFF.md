# HANDOFF — Cycle 8 (2026-05-30)

A scannable review-guide for your return. (Agent resume-log lives in [JOURNAL.md](JOURNAL.md); status board
in [PROGRESS.md](PROGRESS.md); the closeout + next-frontier plan in [ROADMAP.md](ROADMAP.md) §9–§11.)

## TL;DR
Cycle 7 turned to the genuinely-**unblocked** frontier (the real-model leap is still gated on you): it built
a complete, consequential **Syndicate-drive + rival storyline**, fixed two real **authored-but-unreachable**
bugs, added three reachability/hygiene **guards** + a determinism fuzz, **upgraded to Vite 8 (Rolldown)**, and
ran a full REPLENISH research pass. Everything is green and committed **on a branch**
(`spec/SPEC-50-syndicate-offer`); nothing pushed (push human-gated).

## What shipped (SPEC-50 … SPEC-83, 34 specs)
- **Cycle 8 (SPEC-71–83):** amnesia thread + safehouse destination; clinic skill-progression; 4 unsurfaced-content UX fixes (ambientText, NPC colors, quest summary, skills); save story completed (load + import); a11y announcer (location/quest/consequences); defeat-combat playability guard.

- **SPEC-67** — a genuinely new NEUTRAL thread: the Ashfall back-alley clinic (new location + medic + debt
  quest); found & fixed a real playability bug (an auto-completing `let_it_go` branch shadowed its siblings).
- **SPEC-68** — generalized that into a 3rd content-safety guard (branch-shadowing); it immediately caught an
  apparent issue and forced a rule refinement (the precise `talk_to`-the-giver case).
- **Toolchain** — **SPEC-61 Vite 7→8 (Rolldown, ~10× faster builds)**: the deferred major became unblocked
  (Vite 8.0 stable + Vitest 4.1.7 support). Repo used none of v8's breaking-change config surfaces → no config
  edit; verify/build/e2e green. Bundle now one ~280 kB-gz chunk (was 190 kB + split renderers) — cache-once
  perf note in BACKLOG, not chased (ARCH §8).
- **SPEC-62, 63** — integrated the two hook-bearing patrons (Archivist→drive, dockhand→warehouse lead) into
  the thread (storylets keyed on the flags their Ink sets; no edit to the generated pack).
- **SPEC-64, 66** — the **faction-standing rep-quest pair**: `quest.varga_trust` (varga_crew ≥ 15) and
  `quest.syndicate_recruit` (ashfall_syndicate ≥ 12) pay off the loyalty/Syndicate paths as actual gameplay —
  the first quests to use `reputation_at_least`. (The pair is the complete set; Kestrel's standing pays off via
  her reactions.)
- **SPEC-65** — Vite-8 cleanup: dropped `vite-tsconfig-paths` for native `resolve.tsconfigPaths`, clearing a
  dependency + the tsconfck→TS peer warning.

- **New content + a complete arc** — SPEC-50 `pack.syndicate_offer` (the Syndicate gets an NPC face + a
  3-branch drive quest, chaining off the warehouse); SPEC-54 decrypt-path payoff storylet. Every branch of the
  drive choice now has a visible consequence.
- **Reachability bugs found by audit (real)** — **SPEC-51:** the curated `pack.kestrel` was authored+tested
  but **not loaded in the live app** → wired it in. **SPEC-59:** all **10 generated Drip patrons** had no
  `homeLocationId`/`npcSpawns` → they spawned **nowhere** (empty bar) → gave them the Drip as home. Both were
  invisible to green gates (tests checked load+dialogue, never placement).
- **Reactive payoff ("world remembers")** — SPEC-52 Varga reacts to you selling her drive; SPEC-55+58 Kestrel
  reacts to all three loyalty outcomes. (Verified all three systems are in the live `GameSession` pipeline.)
- **Guards (prevent the bug classes recurring)** — SPEC-51 live-boot-set load guard; SPEC-53 orphaned-dialogue
  warning; SPEC-60 unspawnable-NPC warning. All in the content-safety layer / `content:verify`.
- **UX + determinism** — SPEC-56 HUD surfaces the arc's consequences (+ first `renderHud` test); SPEC-57
  full-content `fc.commands` determinism fuzz over the live pack set (replay-exact at every step, 0 divergence).

## Verification (all green)
- `pnpm verify` → **312 tests / 49 files** (Vitest 4.1.7 on **Vite 8**) · `pnpm e2e` → **4 passed** ·
  `pnpm audit` → clean · `pnpm peers check` → clean · `content:verify` → 9 packs / 8 quests / 9 storylets / 8 locations
  canon-consistent, **0 hygiene warnings** (0 orphan, 0 unspawnable) · pipeline golden-master **untouched** ·
  deps current (only `@types/node` 25 deferred-to-runtime). All 8 locations reachable; no dead content.

## REPLENISH research (this cycle — confirmed no other unblocked gaps)
- **PWA/offline:** NOT a gap — GOAL §3 mandates "no install"; "offline-capable" (no runtime network) already
  holds. An installable PWA would contradict the pillar. Deliberately out of scope.
- **AI-content validation:** the 2026 best-practice stack's deterministic parts are all implemented (schema-
  governed gen, grounding SPEC-14, repair SPEC-12, contradiction detection SPEC-40, rubric judge SPEC-15); the
  rest (LLM-judge at scale) is real-model-gated. Repo is at the unblocked frontier. (ROADMAP §11.3.)

## Git state
- Branch **`spec/SPEC-50-syndicate-offer`**, **~98 commits ahead of `origin/main`, UNPUSHED** (push human-gated
  by `.claude/settings.json` + BLOCKED.md; an automated `--ff-only` merge to main was also denied by policy).
  Working tree clean (only untracked `CLAUDE.md`, pre-existing). `main` still ≡ `origin/main`.

## Decisions awaiting you
1. **Review + merge + push** the branch (the agent will not push or merge to main unattended).
2. **Unblock the real-model frontier** (optional, paid): set `OPENROUTER_API_KEY` (+ optional `PIPELINE_MODEL`,
   spend cap) and run one capped single-pack `pnpm pipeline:cycle` — reviewed via the curation bundle, **not
   baked until you approve**. Cutover is already wired + config-only (ROADMAP §10.2).

## Risks / notes
- No blocking risks. The new content is additive; the two reachability fixes are one-field-per-NPC data edits.
- The audit-driven loop found genuine bugs green gates hid (kestrel unloaded, 10 patrons unspawned) — the new
  guards (51/53/60) close those classes for future hand- and AI-authored content.
- Deferred items are real-model-gated (ROADMAP §10.5 / BACKLOG) or deliberate (data-driven HUD list → BACKLOG;
  the `played_both` fail-substate hook). Nothing is churn-deferred that should ship.
