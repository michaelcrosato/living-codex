# SPEC-107 — Doc-sync: document the playability gate as an author contract (SCHEMA.md §8)

**Wave:** Cycle-10 P0 (durable author contract) · **Risk:** LOW (docs-only) · **Status:** Todo

## Description + Impact

`docs/SCHEMA.md §8` documents two of the three content-safety layers as durable author contracts:
the **referential-integrity** pass (line 315) and the **canon-assertion** graph (line 319). The
**third layer — the playability gate** (`staticPlayabilityCheck`, "schema-valid ≠ playable", SPEC-43
and its grown guard family: solvability, island-`reach`, `defeat`-needs-`combat`, `unlock_exit` range,
`offerWhen` contradiction, orphan-dialogue, unspawnable-NPC, branch-shadowing, and the flag/item
unobtainability guards SPEC-70/104/105) — is documented **only** in `/plan/specs` + the code JSDoc,
not in the author contract. This is the exact SPEC-42 gap (a real rule living only in the plan, not the
durable doc).

Impact: authors (and, when unblocked, the real-model generator's authoring guidance) get a single
canonical statement of what makes content *playable*, not just schema-valid — most usefully the rule
of thumb that **every gated flag must be set by something and every required item (`retrieve`/
`has_item`) must be granted by a `give_item` effect or quest reward** (items enter inventory only via
those). Completes the documentation of all three safety layers.

## Approach (files / patterns)

`docs/SCHEMA.md` — add one paragraph after the Layering corollary (line 317) and before the Canon
assertions paragraph (line 319), matching the bold-lead-in house style of the surrounding paragraphs.
Order: integrity → **playability** → canon (refs resolve → content is winnable → content is
consistent). Run `pnpm format:write` (prettier covers `.md`). Docs-only; no code/verify-path change.

## DoD + acceptance

- [ ] SCHEMA.md §8 carries a "Playability gate" paragraph listing the error-level vs warning-level
      checks and the flag/item author rule of thumb, citing SPEC-43/70/104/105.
- [ ] `pnpm verify` EXIT 0 (prettier `--check` passes on the edited markdown).
- [ ] No code change; golden untouched; `pnpm audit` clean.

## Test strategy

Docs-only — no unit test. Acceptance is `prettier --check` (in `verify`) passing + the paragraph being
accurate against `playability.ts` (cross-checked against the JSDoc enumeration).
