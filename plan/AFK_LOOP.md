# AFK_LOOP.md — one unattended iteration

You are running **UNATTENDED** (the operator is away, possibly for hours). Do **exactly ONE unit of
work**, keep the repo green, commit it locally, update the tracker, then **stop this iteration** —
the loop re-fires you for the next unit. Self-contained on purpose: re-read this file each iteration.

## Absolute guardrails (also enforced by `.claude/settings.json` deny rules)
- **NEVER** `git push`, force-push, `reset --hard`, `rebase`, `commit --amend`, change git
  `config`/`remote`, `rm -rf`, or `publish`. Work stays as **local commits on `main`**.
- **NEVER** call a paid or network service (no `OPENROUTER_API_KEY` / real generation). **Offline only.**
  Pipeline work uses the deterministic `StubProvider`.
- **Keep `pnpm verify` GREEN.** Never commit red. If you can't get green after a reasonable effort,
  **revert and park** the item (don't leave the tree broken).
- **Stay in scope.** Out-of-scope discoveries → `plan/BACKLOG.md`, never the diff.
- **No scope creep, no busywork.** When the safe backlog is exhausted, **STOP** — do not invent work.

## The iteration
1. **Re-baseline.** Run `pnpm agent:afk-status`. Read HEAD + the next open spec. If the tree is dirty
   (a crashed prior iteration), recover: commit it if `pnpm verify` is green, else `git restore`/`git
   stash` back to clean. Never build on a dirty or red base.
2. **Pick the next unit**, in this priority:
   1. The highest-priority **`Todo`** spec in `plan/PROGRESS.md` whose wave is open and dependencies
      are met (`plan/ROADMAP.md`). Respect the collision map. *(Currently: SPEC-14, SPEC-15, then
      SPEC-16 — do SPEC-16 in isolation; it now also migrates `storylet.ts`.)*
   2. If **no `Todo` specs remain**: a SAFE, clearly-scoped item from the **"do when convenient"** or
      **doc-drift** parts of `plan/BACKLOG.md` — e.g. SCHEMA §3 doc-sync, e2e port robustness,
      `dependency-cruiser` additions, `tsconfig erasableSyntaxOnly`. **Do NOT** take "blocked on a paid
      service" or "needs a design doc" items. Promote the chosen item to a one-paragraph spec first.
   3. If neither remains: **STOP THE LOOP.** Append a final summary to the `plan/PROGRESS.md` changelog
      and end — the safe backlog is done.
3. **Read** `docs/GOAL.md` §3 (locked) + §5 (invariants), the spec, and the ≤3 files it names.
4. **Isolate.** `git switch -c spec/SPEC-NN-slug` (or a worktree). Mark the spec **`In progress`** in PROGRESS.
5. **Implement** the minimal in-scope change + colocated `*.test.ts` (guide Recipe 1 for systems,
   Recipe 5 for schema changes — additive, deprecate-don't-delete, bump version + migration + test).
6. **Verify.** Targeted tests first (`pnpm --filter <pkg> test`, `pnpm typecheck`), then **`pnpm
   verify`** (must be green). UI specs also need a browser run (`pnpm e2e`; see the runbook's e2e note).
   If you **cannot** get green: `git restore .` / abandon the branch, mark the spec **`Blocked`** in
   PROGRESS with the reason, and go to the next unit. Do not commit a red tree.
7. **Self-review** the diff vs the spec's ACs + Out-of-scope: any `any`? non-exhaustive event/effect
   switch? file >400 lines? a file the spec didn't name? a secret? a golden-master change without a note?
8. **Commit** locally, one logical unit, message referencing `SPEC-NN`. Merge the branch into `main`
   (`git switch main && git merge --no-ff spec/SPEC-NN-slug`). **NEVER push.**
9. **Document.** PROGRESS row → `Done` + short-hash + verify result; add a changelog line; update any
   affected `docs/*`, README, package `index.ts`. Keep SCHEMA/WORLD_STATE current on schema/World changes.
10. **Summarize** in one line, then **STOP this iteration.** The loop re-fires for the next unit.

## Whole-run done condition
All `Todo` specs `Done` **and** no eligible BACKLOG item remains → STOP and report. Or the operator's
time window elapsed. Honor the operator's stopping point; never push; leave `pnpm verify` green.
