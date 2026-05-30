# SPEC-33 — New hand-authored content pack (depth + exercise the new verbs)

- **Status:** Todo · **Pillar:** Player Experience / Pipeline B · **Wave:** Cycle-3 Phase 2 (Major Features) · **P=10**
- **I**=4 **F**=3 **R**=2 **Ft**=5 · **LOW-MED risk — data only, same load path; golden untouched.**

## Description & expected impact
The thesis is *"a story wrapped in an engine"* — depth comes from **more curated content**, not more engine.
The engine now supports skill-gated passive checks (SPEC-23) and storylets (SPEC-11/24), but only the opening
+ rival-fixer arcs use the full surface. Author a **new district pack** that deepens the showcase and is the
first content to deliberately combine: a **3-solution branching quest**, **`skill_at_least` gating** on a
dialogue/exit/quest branch (proving passive checks in real content), **reactive `reactsTo`** consequences, and
**fire-once storylets** — all loaded through the exact same path as every other pack.

## Definition of Done & Acceptance Criteria
- A new `content/core/pack.<district>` with: a location (vector art, exits), **≥3 NPCs** (with bios + Ink
  dialogue compiled via `content:compile-ink`), **one branching quest with ≥3 viable solutions** (≥1 branch
  gated by `skill_at_least`), at least one **`reactsTo`** consequence, and **≥2 fire-once storylets**.
  `provenance.authoredBy: "human"`.
- `pnpm content:validate` + `pnpm content:verify` pass (pack count grows; storylets satisfiable per SPEC-25;
  quest solvable/reachable; canon-clean).
- A colocated test (like `rival-fixer.spec.ts`) loads the pack **alongside** the others, plays the quest
  end-to-end through the real engine, exercises the `skill_at_least` branch (low-skill blocked / high-skill
  open), fires a storylet bark, and asserts the **replay invariant** holds.
- **Golden-master untouched** (hand-authored; no pipeline change). `pnpm verify` green. If the app should ship
  it, wire it into `main.ts`'s `loadPacks` and confirm via the e2e/dev (or state explicitly if UI not run).

## Implementation approach
`docs/agent-guides/adding-content.md`. Author the pack JSON + `.ink` sources; compile Ink; gate one quest
branch with `{ kind: "skill_at_least", skill, value }`; add `reactsTo` for a persistent consequence; add
fire-once storylets (effect sets a "seen" flag a precondition excludes). Add the colocated play-through test.

## Files
- `content/core/pack.<district>/pack.json` (+ `ink/*.ink`), a colocated `packages/app-web/test/*.spec.ts`,
  optionally `packages/app-web/src/main.ts` (load it), docs note. No engine/schema change (uses existing verbs).

## Dependencies / prereqs
SPEC-23 (skill_at_least) landed ✓; SPEC-24/25 (storylets + verify) landed ✓. Independent of the tooling specs.

## Test strategy
Same-path load + full quest play-through (all 3 branches reachable; skill-gated branch respects threshold) +
storylet fire + replay invariant + `content:validate`/`content:verify`. Browser check if wired into the app.

## Effort
M-L (authoring is the bulk).

## Out of scope
New engine verbs (use what exists; if authoring reveals a real need, file a Recipe-5 spec — don't add
speculatively); pipeline/generation changes; art beyond vector shapes.
