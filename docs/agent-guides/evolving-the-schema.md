> Part of the Living Codex build package. See `AGENTS.md` and `docs/AGENT_GUIDES.md` (index).

## Recipe 5 — Evolving the schema (adding a verb, deprecating a field)

The world grows for years; the schema changes. Keep it bounded so old content and saves don't break.

**Steps:**
1. **New verb (objective/effect/condition):** add the variant in `content-schema/src/` **and** handle it in the engine in the same ticket (Recipe 1). Never ship a schema verb the engine can't apply.
2. **Deprecate, don't delete:** mark the old field deprecated in Zod (`.describe("DEPRECATED: use X")`), keep it working for one major version, then remove.
3. **Bump the version** of whatever format changed — `ContentPack`, `World`, or `ReplayLog` (`WORLD_STATE.md §7`).
4. **Write a migration** in `tools/migrate/` that transforms prior-version data to the new version, plus a **migration test** from the previous version's fixture.
5. **Acceptance criteria for any schema-change ticket must include "migration path for existing packs/saves."**
6. `pnpm verify`.

**Files touched:** the schema file, the engine `apply`/system files, a migration script + test, possibly a content pack. Predictable and bounded — concept-localized even though it spans files.

---
