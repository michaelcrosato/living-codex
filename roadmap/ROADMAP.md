# Roadmap

> **Operator: this is your file.** Plain-English bullets; reorder to change priorities. Agents only ever mark items "✅ shipped (PR #n)" — they never rewrite your words. Sections mean: **Now** = working on it, **Next** = queued, **Later** = someday, **Ideas** = unscoped thoughts.

## Now

- Stand up the TypeScript + pnpm + Vite skeleton: workspace layout, `engine-core`, `content-schema`, `content-loader`, and `app-web` packages wired together, with `pnpm verify` green from scratch.
- Wire the content pack loader so the four default packs (`pack.opening`, `pack.district_barks`, `pack.drip_market`, `pack.the_drip_patrons`) load, validate against the schema, and pass the existing test suite.
- Add a pack catalog sync check: a script that proves `content/PACKS.md` matches what `app-web` actually imports at runtime — fail CI if they drift.

## Next

- Golden replay fixture: commit a short First Light replay, assert its hash with `pnpm replay:verify`, and make it a required CI gate.
- Quest journal surface: show the active quest, branch labels, and known objectives in the browser UI; prove it with Playwright or a manual-browser screenshot.
- Interaction and exit affordances: nearby NPC/exit prompts and blocker text are legible at a glance; include Playwright evidence.
- Warehouse branch audit: verify that the talk, sneak, and force routes through the warehouse are all reachable and each leaves a distinct, persistent consequence.

## Later

- Save import/load UI (not just export): exported saves become usable bug-and-replay artifacts.
- The Drip density pass: 8-12 patrons with distinct voice, at least one mechanically useful rumor, and a clear clue path to the warehouse.
- Varga and Syndicate reaction matrix: different lines and barks for peaceful, sneaky, violent, bribed, and failed outcomes.
- Hook beat: the post-encrypted-drive NPC or bark clearly points to a larger mystery and leaves the player wanting more.
- Pipeline B proposal bundles: `pnpm pipeline:cycle` produces reviewable artifacts (candidate JSON, prompts, model list, critique scorecard) before the human bakes them in.
- Content diff report: any candidate pack review shows new/changed IDs, dependencies, and blast radius on existing canon.
- E2E failure artifacts: failed Playwright smoke runs upload traces, screenshots, and video automatically.
- Stale-doc reference check: a script or CI step warns on paths and pack references that no longer exist.
- Reconcile Cursor Cloud PR #1: cloud-agent instructions live in one concise place and do not bloat root docs.

## Ideas

- Pre-purge implementation reference: an earlier version of the engine and content existed in the repo's git history (tag `pre-purge-20260609`). Do not bulk-restore — treat it as a quarry. If a specific mechanic, schema shape, or content pack from that history turns out to be worth reviving, file a ticket referencing the tag and cherry-pick only the exact piece needed.
- Deterministic canon export hash: same packs always produce the same export/context hash, making content audits reproducible.
- Validation repair loop: invalid structured output from the pipeline is repaired automatically or surfaces precise errors for the curator.
- Canon graph rules: add assertion rules only from real contradiction shapes found in committed or candidate packs — never speculatively.
- Content-driven engine verbs: `lockpick`, `learn_clue`, `spend_favor`, `intimidate`, `disguise`, `blackmail`, `trade`, `rumor`, `debt` — each only when a content pack earns the mechanic.
- Vector-first renderer swap points: sprites and voice can arrive later behind stable interfaces, unlocking AI-generated art and audio without touching game logic.
