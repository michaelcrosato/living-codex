> Part of the Living Codex build package. See `AGENTS.md` and `docs/AGENT_GUIDES.md` (index).

## Recipe 2 — Adding or extending content

Content is **data**, never code. You are producing/editing files under `content/` that validate against `content-schema`.

**Steps:**
1. **Find the schema** for what you're adding in `content-schema/src/` (e.g. `quest.ts`). Read it — it is the contract.
2. **Write the data** as JSON in the appropriate pack under `content/core/` (hand-authored) or `content/generated/` (pipeline output). Use existing IDs for references; invent new dotted IDs for new entities.
3. **If you need a verb that doesn't exist** (an objective kind, an effect, a condition), STOP. That's not a content task — it's an engine ticket. Add it to the schema *and* the engine first (Recipe 1 + a schema entry), then author the content. Never smuggle behavior into data.
4. **Validate:** `pnpm content:validate`. Fix any Zod or referential-integrity errors (the error names the offending id/pack).
5. `pnpm verify`.

**Files touched:** files under one `content/<pack>/` directory. Zero engine files for pure content. If you touched engine code, it wasn't a content task.

---
