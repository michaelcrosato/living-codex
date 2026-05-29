# Repository Structure — The Living Codex

Generated layout. Docs live in `docs/`; `AGENTS.md` and `README.md` sit at the root where agents and humans look first. The `packages/`, `content/`, and `tools/` trees match `docs/ARCHITECTURE.md §2` and are ready for ticket **T-00**.

```
living-codex/
├── content/
│   ├── core/
│   │   ├── pack.opening/
│   │   └── README.md
│   └── generated/
│       └── README.md
├── docs/
│   ├── agent-guides/
│   │   ├── adding-a-system.md
│   │   ├── adding-content.md
│   │   ├── debugging.md
│   │   ├── evolving-the-schema.md
│   │   └── extending-the-renderer.md
│   ├── AGENT_GUIDES.md
│   ├── ARCHITECTURE.md
│   ├── CONTENT_PIPELINE.md
│   ├── GOAL.md
│   ├── SCHEMA.md
│   ├── TICKETS.md
│   ├── VERTICAL_SLICE.md
│   ├── WORLD_BIBLE.md
│   └── WORLD_STATE.md
├── packages/
│   ├── app-web/
│   │   ├── src/
│   │   └── README.md
│   ├── content-loader/
│   │   ├── src/
│   │   └── README.md
│   ├── content-schema/
│   │   ├── src/
│   │   └── README.md
│   ├── engine-core/
│   │   ├── src/
│   │   │   ├── conditions/
│   │   │   ├── ecs/
│   │   │   ├── events/
│   │   │   ├── ports/
│   │   │   ├── state/
│   │   │   ├── systems/
│   │   │   └── time/
│   │   └── README.md
│   ├── narrative-ink/
│   │   ├── src/
│   │   └── README.md
│   ├── persistence/
│   │   ├── src/
│   │   └── README.md
│   └── render-pixi/
│       ├── src/
│       └── README.md
├── tools/
│   ├── migrate/
│   │   └── README.md
│   └── pipeline/
│       ├── src/
│       │   ├── cache/
│       │   ├── llm/
│       │   ├── pipelines/
│       │   ├── prompts/
│       │   └── schemas/
│       └── README.md
├── AGENTS.md
└── README.md
```

## Where each document lives and why

| File | Location | Why |
|------|----------|-----|
| `README.md` | root | Entry point / index; first thing anyone opens. |
| `AGENTS.md` | root | Convention: coding agents look for `AGENTS.md` at the repo root. Keep it there. |
| `GOAL.md` | `docs/` | North star. |
| `ARCHITECTURE.md` | `docs/` | Stack, package graph, determinism, enforcement. |
| `WORLD_STATE.md` | `docs/` | Runtime state contract (World, replay, quests, player). |
| `SCHEMA.md` | `docs/` | The content treaty. |
| `TICKETS.md` | `docs/` | Sequenced build plan. |
| `AGENT_GUIDES.md` | `docs/` | Index of the task recipes. |
| `agent-guides/*.md` | `docs/agent-guides/` | Individual recipes referenced by `AGENTS.md` and tickets. |
| `CONTENT_PIPELINE.md` | `docs/` | Offline Pipeline B workflow. |
| `WORLD_BIBLE.md` | `docs/` | Canon format + Ashfall starter setting. |
| `VERTICAL_SLICE.md` | `docs/` | The 10-minute demo target. |

## Source tree (empty, ready for T-00)

- `packages/` — the eight workspaces from `ARCHITECTURE.md §2`. `engine-core/src/` is pre-divided into the modules from §3 (`time, state, ecs, systems, events, conditions, ports`). Each package has a one-paragraph `README.md` stating its job and public API.
- `content/core/pack.opening/` — hand-authored slice content (T-13). `content/generated/` — pipeline output (T-14c).
- `tools/pipeline/` — offline content pipeline (T-14a–c), never shipped. `tools/migrate/` — schema/save migrations.
- `.gitkeep` files hold empty directories in version control; delete them as real files land.

> Not yet present (created during T-00): `pnpm-workspace.yaml`, `tsconfig.base.json`, ESLint/Prettier/dependency-cruiser configs, Vitest config, and the root `package.json` with the `pnpm verify` script. See the T-00 scaffolding note in `docs/TICKETS.md`.
