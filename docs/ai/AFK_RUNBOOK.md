# AFK_RUNBOOK.md — running The Living Codex unattended (AFK)

How to run an autonomous "away-from-keyboard" session that works through the `plan/` backlog,
keeping `pnpm verify` green and committing **locally per spec** — **never pushing**. The per-iteration
instructions live in [plan/AFK_LOOP.md](../../plan/AFK_LOOP.md); this is the operator's launch/monitor/stop guide.

## 1. Preflight (once, before launching)
```
pnpm agent:preflight      # must print "OK — safe to launch": clean tree + green pnpm verify
pnpm agent:afk-status     # shows HEAD, ahead-of-origin, and the next open spec
```
If preflight is BLOCKED, fix the cause (commit/stash a dirty tree; make `pnpm verify` green) first.

## 2. Launch (pick one)
- **Recommended — self-paced loop** (the session stays open; the model paces itself):
  ```
  /loop Read plan/AFK_LOOP.md and execute exactly one iteration, then stop.
  ```
  The model does one spec per iteration and re-fires until the safe backlog is exhausted (or you stop it).
- **Fixed interval** (e.g. a tick every 25 min):
  ```
  /loop 25m Read plan/AFK_LOOP.md and execute exactly one iteration, then stop.
  ```
- **Durable cron** (survives restarts; auto-expires after 7 days): ask Claude to set up a `CronCreate`
  firing the same prompt every ~25 min with `durable: true`.

## 3. Safety model (already configured — nothing reaches origin while you're away)
- **`.claude/settings.json`** (committed) ALLOWS the gates + local git + tests/content so the loop
  doesn't stall on prompts, and **DENIES** `git push`, force-push, `reset --hard`, `rebase`, `amend`,
  git `config`/`remote`, `rm -rf`, and `publish`. **Deny rules win even in permissive modes** — the
  hard safety net.
- **[plan/AFK_LOOP.md](../../plan/AFK_LOOP.md)** instructs: never push, offline only, keep verify
  green, **revert-and-park** on failure, no scope creep, stop when the safe backlog is empty.
- Work accumulates as **local commits on `main`**. **Nothing reaches `origin` until you push.**
- A command not in the allow-list **stalls (waits)** rather than running unattended — a deliberate fail-safe.

## 4. Monitor (any time, from another shell)
```
pnpm agent:afk-status                 # one-glance: HEAD, next spec, recent commits
git log --oneline origin/main..HEAD   # everything the run has produced (unpushed)
tail -40 plan/PROGRESS.md             # the live tracker + changelog
```

## 5. Stop
- Interrupt the loop (Esc, or end the session). Any in-flight work is on a `spec/*` branch; nothing
  is pushed. Resume later with `pnpm agent:preflight` then re-launch.

## 6. After the run — you review, then publish
```
git log --oneline origin/main..HEAD     # review the batch
git diff origin/main..HEAD              # review the changes
pnpm verify                             # confirm green
git push origin main                    # publish when satisfied (intentionally manual)
```

## 7. Notes & limits
- **The loop stops when the safe backlog is exhausted** — it will not invent busywork to fill a fixed
  window. Currently the committed backlog is **SPEC-14, SPEC-15, SPEC-16**, after which the loop pulls
  the **"do when convenient" / doc-drift** items from `plan/BACKLOG.md` (NOT the paid-service or
  needs-a-design-doc items). To guarantee a longer run, deepen the backlog first (promote BACKLOG → specs).
- **e2e:** the loop's gate is `pnpm verify`, which does **not** run Playwright, so the loop is unaffected
  by browser/port issues. A foreign server squatting Playwright's preview port is a known footgun
  (`plan/BACKLOG.md`); fixing it is itself a backlog item the loop can pick up.
- **SPEC-16 (Zod 4)** is the one MED-risk item — it migrates every schema (now including `storylet.ts`
  from SPEC-11) and changes the golden-master. The loop does it in isolation, last.
- The durable cron auto-expires after 7 days; a `/loop` lives only while the session is open.
