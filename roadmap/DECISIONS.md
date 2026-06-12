# Decisions Log (append-only, ADR-lite)

> One entry per autonomous judgment call: context → decision → reversible? → where it lives.

---

- **QA deployment surface = Vercel**: charter specifies browser-playable Vite app with no backend; Vercel is the conventional choice for Vite static/SPA deployments with per-PR preview URLs. Reversible — any static host (Netlify, Cloudflare Pages) is a drop-in swap. (department)
- **Database = none (static files only)**: charter hard scope explicitly forbids backend services and runtime data stores; all content is baked static JSON packs; save state is browser localStorage. No database CLI or migration tooling needed. Reversible only if charter scope changes. (department)
- **E2E framework = Playwright**: charter already references `pnpm e2e` and "Playwright browser smoke" in GOAL.md and README. Confirmed as the existing E2E approach — no framework change needed. (department)
- **Package name = living-codex**: kebab-case product slug matching the repo name and product identity. (department)
- **Develop branch = default branch**: engine runbook requirement; main/master is the stable promotion target; all agent work targets develop. (department)

