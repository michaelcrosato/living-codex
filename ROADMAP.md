# ROADMAP.md

Operational roadmap for autonomous work. Product vision is [docs/GOAL.md](docs/GOAL.md);
the sequenced *engine* build plan is [docs/TICKETS.md](docs/TICKETS.md) (T-00…T-16, all complete).
This file tracks the **agent-workflow** phases and the atomic tickets in [tickets/](tickets/).

## Assessment (2026-05-29)
The codebase is **healthy and green**: `pnpm verify` passes (143 tests), the engine is
browser-playable, vendor isolation + replay determinism are enforced, and docs are rich. The gap
this initiative closes is **AFK-readiness**: an explicit agent loop, thin tool scripts, a
token-efficient repo map, skip paths, and atomic tickets — so an agent can work unattended.
No failing gates were found. The one real defect found and fixed: stale doc paths in `README.md`
(linked `docs/` files as if at repo root) — see TICKET003.

## Phases
1. **Stabilize** — ✅ done before this session: `pnpm verify` green, CI present.
2. **Tooling / deps** — ✅ `scripts/agent/*.sh` + `pnpm agent:*` wrappers + `.env.example` + `.aiignore` (TICKET001, TICKET002).
3. **Docs** — ✅ `GOAL.md`, `ROADMAP.md`, `AGENTS.md` loop, `docs/ai/REPO_MAP.md`, README quick-start (TICKET004).
4. **Bugs / tests** — ✅ high-confidence path/documentation bugs fixed; coverage reporting is in CI (TICKET003, TICKET005).
5. **Modularity** — ✅ already strong (pure core, ports, vendor isolation, <600-line files). Maintain; do not refactor without cause.
6. **Features** — open: grow content via Pipeline B; add engine verbs only as content demands (pattern proven by S4 bribe). Track per future ticket.
7. **CI** — ✅ `verify.yml` runs `pnpm verify` + non-blocking e2e. Possible follow-up: run `pnpm agent:doctor` as a readiness step (TICKET005 stretch).

## Tickets
| File | Title | Priority | Status |
|------|-------|----------|--------|
| [TICKET001](tickets/TICKET001.md) | Bootstrap & dependency readiness | High | Done |
| [TICKET002](tickets/TICKET002.md) | Agent workflow scripts (`scripts/agent/*`) | High | Done |
| [TICKET003](tickets/TICKET003.md) | Fix stale `README.md` doc paths | High | Done |
| [TICKET004](tickets/TICKET004.md) | Agent docs & repo map | High | Done |
| [TICKET005](tickets/TICKET005.md) | CI doctor step + coverage reporting | Medium | Done |

## Risks / blockers
- **No blockers.** Real generation (`pnpm pipeline:cycle/bake`) needs `OPENROUTER_API_KEY` (a paid
  service) — out of scope for unattended work; the demo stub keeps everything testable offline.
- Agent scripts assume `bash` on PATH (true on CI/macOS/Linux and via Git Bash/WSL on Windows).
- e2e needs `pnpm exec playwright install chromium`; it is non-blocking by design.

## Loop
Follow the workflow loop in [AGENTS.md](AGENTS.md): status → read GOAL/ROADMAP/REPO_MAP + top
ticket → pick a small unblocked ticket → mark in progress → change → targeted then broad checks →
update docs/ticket → note follow-ups → commit → summarize. Repeat unprompted.
