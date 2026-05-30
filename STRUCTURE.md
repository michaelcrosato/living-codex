# Repository Structure — The Living Codex

Repository layout (built). Docs live in `docs/`; `AGENTS.md`, `README.md`, `GOAL.md`, and
`ROADMAP.md` sit at the root where agents and humans look first. The `packages/`, `content/`, and
`tools/` trees match `docs/ARCHITECTURE.md §2`. For a concise, link-rich agent map see
`docs/ai/REPO_MAP.md`.

```
living-codex/
├── content/
│   ├── PACKS.md              # default browser content pack catalog
│   ├── core/
│   │   ├── pack.opening/
│   │   ├── pack.district_barks/
│   │   ├── pack.drip_market/
│   │   ├── pack.syndicate_offer/
│   │   ├── pack.kestrel/
│   │   ├── pack.varga_trust/
│   │   ├── pack.clinic/
│   │   ├── pack.lost_thread/
│   │   ├── pack.street_kid/
│   │   ├── pack.bribe_demo/
│   │   └── README.md
│   └── generated/
│       ├── pack.the_drip_patrons/
│       └── README.md
├── docs/
│   ├── agent-guides/
│   │   ├── adding-a-system.md
│   │   ├── adding-content.md
│   │   ├── debugging.md
│   │   ├── evolving-the-schema.md
│   │   └── extending-the-renderer.md
│   ├── ai/
│   │   └── REPO_MAP.md
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
├── scripts/
│   └── agent/              # thin gate wrappers (bootstrap, doctor, check, status, …)
├── tickets/               # atomic agent work items (TICKET0NN.md)
├── tools/
│   ├── migrate/
│   │   ├── src/
│   │   └── README.md
│   ├── scripts/           # pnpm script bodies (content/pipeline/schema CLIs)
│   └── pipeline/
│       ├── src/
│       │   ├── cache/
│       │   ├── llm/
│       │   ├── pipelines/
│       │   ├── prompts/
│       │   └── schemas/
│       └── README.md
├── .aiignore
├── .env.example
├── AGENTS.md
├── GOAL.md
├── README.md
├── ROADMAP.md
└── STRUCTURE.md
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
| `PACKS.md` | `content/` | Default browser content pack catalog. |

## Source tree (built)

- `packages/` — the workspaces from `ARCHITECTURE.md §2`. `engine-core/src/` holds the §3 modules (`time, state, ecs, systems, events, conditions, ports`). Each package has a one-paragraph `README.md` stating its job and public API.
- Default browser content (10 packs, in load order): `content/core/pack.opening`, `pack.district_barks`, `pack.drip_market`, `pack.syndicate_offer`, `pack.kestrel`, `pack.varga_trust`, `pack.clinic`, `pack.lost_thread`, `pack.street_kid`, and `content/generated/pack.the_drip_patrons`. Keep this synchronized with `content/PACKS.md` and `packages/app-web/src/main.ts`.
- `tools/pipeline/` — offline content pipeline, never shipped. `tools/migrate/` — schema/save migrations. `tools/scripts/` — the `pnpm` CLI bodies.
- Root config: `package.json` (the `pnpm verify` gate), `pnpm-workspace.yaml`, `tsconfig.base.json` + `tsconfig.json` + `tsconfig.dom.json`, `eslint.config.js`, `.dependency-cruiser.cjs`, `vitest.config.ts`, `.prettierrc.json`. CI in `.github/workflows/verify.yml`.

> Per-file locations and skip paths for agents: `docs/ai/REPO_MAP.md`.
