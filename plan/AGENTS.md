# /plan/AGENTS.md — Execution rules for this backlog

Terse on purpose. This governs *how* an autonomous agent executes the `/plan/` specs. It does not
replace the root [AGENTS.md](../AGENTS.md) (the project's standing law) or [docs/GOAL.md](../docs/GOAL.md)
(the north star) — it adds the loop specifics for this initiative.

## Read-first order (per spec)
1. [docs/GOAL.md](../docs/GOAL.md) §3 (locked) + §5 (invariants) — the non-negotiables.
2. The spec file in [specs/](specs/) you are about to do (it names the ≤~3 files to read).
3. The files that spec names. Read a package's `index.ts` before its internals.
4. [ROADMAP.md](ROADMAP.md) for DAG/collision context; [RISK_REGISTER.md](RISK_REGISTER.md) for the spec's risks.

## The operating loop (repeat per spec, unprompted)
1. **status** — `pnpm agent:status` (branch, HEAD, clean tree). Re-baseline: this plan ages.
2. **pick** — the highest-priority unblocked spec whose wave is open (see ROADMAP §3/§4). Respect the
   collision map — never run two specs that edit the same file concurrently.
3. **isolate** — work on a branch or worktree per spec: `spec/SPEC-NN-slug`. Parallel agents → separate
   worktrees off `main` (`git worktree add` / EnterWorktree), one spec each, no shared files.
4. **mark** — set the spec's status to `In progress` in [PROGRESS.md](PROGRESS.md).
5. **implement** — the minimal in-scope change. Add/adjust colocated `*.test.ts`. Stay inside the spec's
   "Files" + "Out of scope". A schema/verb change follows Recipe 5; a system follows Recipe 1.
6. **check** — targeted first (`pnpm --filter <pkg> test`, `pnpm typecheck`), then broad: `pnpm verify`.
   UI/feature specs additionally need a real run (`pnpm dev`) or `pnpm e2e` — tests verify *code*, not
   *feel*. If you cannot run the UI, say so explicitly; never claim a UI works untested.
7. **self-review** — diff against the spec's ACs and Out-of-scope. Run `/code-review` mentally: any
   `any`? unhandled event arm? file >400 lines? touched a file the spec didn't name? secret committed?
8. **document** — update the spec (Notes/Status), [PROGRESS.md](PROGRESS.md), and any affected
   `docs/*`, `README.md`, package `index.ts`/`README.md`. Schema changes → migration + migration test.
9. **commit** — locally, one logical unit, clear message. **Never push** without explicit human go-ahead.
10. **follow-ups** — anything discovered & out-of-scope → [BACKLOG.md](BACKLOG.md) (a new entry), not the diff.
11. **summarize** — what changed, check results, commit hash, next spec. Then go to 1.

## Verification commands (ground truth — run them, don't assume)
- Full gate (DoD): **`pnpm verify`** = `typecheck` (pure `tsconfig.json` **and** DOM `tsconfig.dom.json`)
  → `lint` (eslint) → `deps:check` (dependency-cruiser) → `test` (vitest, 143+ tests) →
  `content:validate` → `content:verify` → `replay:verify`.
- Targeted: `pnpm --filter @codex/<pkg> test` · `pnpm typecheck` · `pnpm lint`.
- Content: `pnpm content:validate` (schema+refs) · `pnpm content:verify` (solvable+reachable+canon) ·
  `pnpm content:compile-ink` (recompile `.ink` → pack `compiled`).
- Pipeline (offline): `pnpm pipeline:export` · `pnpm pipeline:cycle --brief "…"` (StubProvider demo
  when no `OPENROUTER_API_KEY`) · `pnpm pipeline:bake` · `pnpm content:new <name>`.
- Browser: `pnpm dev` (vite) · `pnpm e2e` (Playwright; needs `pnpm exec playwright install chromium`).
- Readiness: `pnpm agent:doctor` · `pnpm agent:status` · `pnpm agent:check` (== verify).

## Never do these (in addition to the root AGENTS.md "Never do" list)
1. **Never add a runtime/live LLM call** or any network call inside shipped packages. Pipeline is offline.
2. **Never import `pixi.js` outside `render-pixi/`, `inkjs` outside `narrative-ink/`,** or any vendor SDK / DOM / `node:*` / `fetch` / `Math.random` / `Date.now` inside `engine-core/`.
3. **Never mutate `World` in place** — change state only by emitting an `Event` folded via `applyEvent`.
4. **Never put non-JSON in `World`** (no Map/Set/class/Date/closure). ECS is a derived layer.
5. **Never re-run Ink on replay** — capture Ink state into the log; restore it.
6. **Never make engine logic depend on a specific piece of content.** Reference by ID.
7. **Never push, force-push, change visibility, or touch git config** without explicit human approval.
8. **Never let a file pass 600 lines** (warn at 400). Split first.
9. **Never claim work is done on the strength of an agent summary** — verify the diff and the gate.

## Gotchas (learned this session — save the next agent the surprise)
- **Benign warnings:** `pnpm test`/`content:verify` print `Recursive reference detected at …offerWhen…`
  from `zod-to-json-schema` during Quest generation. Harmless; not a failure. (SPEC-16 removes the dep.)
- **Golden-master:** `tools/pipeline/src/cycle.test.ts` asserts a byte-stable candidate pack hash. **Any
  change to `ContentPack`/schema or generation will change it** — update the golden hash deliberately and
  note it in the commit (last value updated in S5 when `assertions` was added).
- **Split typecheck preserves purity:** `tsconfig.json` excludes DOM libs so `engine-core` can't import
  the DOM; `tsconfig.dom.json` covers `app-web`/`render-pixi`/`persistence`. Run **both** (verify does).
- **depcruise excludes `dist/`**; `app-web/dist/` is built output — don't hand-edit it.
- **Credits** are `world.inventory["item.credits"]` (not a player field). Conservation bounds live in
  `applyEvent`, not the schema.
- **Skip paths:** `.aiignore` (generated/vendor/build) and the large `compiled` Ink blob inside each
  `content/**/pack.json` — regenerate with `content:compile-ink`, don't read/edit it.
- **Real generation is key-gated** (`OPENROUTER_API_KEY`, paid). Unattended work uses **StubProvider**
  (hermetic). Do **not** assume an LLM re-run reproduces a pack byte-for-byte — trust the baked JSON.
- **Windows shell is PowerShell**; the agent `*.sh` scripts need bash on PATH (Git Bash/WSL). `pnpm`
  scripts themselves are cross-platform.

## Cycle-2 gotchas (Waves 5–9 — dependency migrations + storylets)
- **One dep per spec, on its own branch.** Zod 4 / TS 6 / Vitest 4 / ESLint 10 / fast-check 4 each have
  breaking changes; bundling them makes a red `verify` un-bisectable. Run `pnpm verify` after each.
- **Serialize the coupled pairs:** SPEC-18 (ESLint/ts-eslint) ↔ SPEC-20 (TS 6) share the `typescript-eslint`
  supported-TS range; **SPEC-16 (Zod 4) is HARD-before** every schema-touching feature (SPEC-23, SPEC-26).
- **Re-baseline numbers deliberately:** Vitest 4 (SPEC-21) remaps V8 coverage — record the *new* coverage
  baseline in PROGRESS; it's report-only, do **not** add a floor. Vitest 4 also renames `workspace`→`projects`
  and changes `getMockName()` (was `spy`).
- **fast-check 4 (SPEC-22):** a *new* fuzz divergence is a **real determinism bug (R1)** — shrink + file +
  fix or revert; never silence. Keep seeds pinned and `numRuns` bounded.
- **`SkillName` single source of truth (SPEC-23):** content-schema can't import engine-core (deps rule) —
  define the skill enum in content-schema and derive engine-core's `SkillId` from it; colocate an assertion
  that the two lists are identical so they can't drift.
- **Salience = reactive/ambient only (SPEC-24/26):** never gate a main-plot beat on salience — main plot
  stays behind explicit quest flags (avoids the "accidental precondition" failure mode).
- **Golden-master churn (SPEC-26):** emitting storylets changes the candidate-pack bytes — update the
  `cycle.test.ts` hash deliberately and note the reason in the commit (R2). Never weaken the assertion.
- **`tsgo`/TS 7 is BACKLOG, not a spec:** keep `tsc` authoritative; SPEC-20 stops at TS 6.

## Autonomous vs ask
- **Proceed without asking** for: in-scope edits/tests/refactors, doc updates, local commits, running any
  gate, deleting clearly generated/obsolete files, choosing among libs already locked in docs. When
  uncertain-but-unblocked, pick the safest assumption, **write it down** (spec Notes / BACKLOG), continue.
- **Stop and ask** only for: credentials/paid services (real generation), destructive/irreversible or
  shared-state actions (push, force-push, visibility change, dropping data), or legal/security ambiguity.
  Prefer dry-run/local/mock; never hard-code or expose secrets.
