# SPEC-118 — Doc-sync: SCHEMA.md names the removed `zod-to-json-schema` dep

**Wave:** Cycle-11 P1 (doc-sync / epistemic debt) · **Risk:** LOW · **Status:** Done (docs-only; `grep zod-to-json-schema docs/SCHEMA.md` → 0; `pnpm verify` EXIT 0).

## Description + Impact

`docs/SCHEMA.md` is "the single most important contract in the project" (its own line 3) — the
author-facing treaty an agent or human reads before generating/validating content. Its line 5 still
says the schemas "export to **JSON Schema** (via `zod-to-json-schema`)".

That dependency was **removed in SPEC-16** (Zod 4 migration): `packages/content-schema/src/json-schema.ts`
now uses Zod 4's native `z.toJSONSchema(ContentPack, { unrepresentable: "any" })`, and
`zod-to-json-schema` appears in **zero** `package.json` files and **zero** times in `pnpm-lock.yaml`
(verified). A reader trusting SCHEMA.md would reach for a deleted, unmaintained package — the exact
doc-drift class SPEC-107 (playability gate) and SPEC-116 (verify-chain `format` step) fixed.

This is the SPEC-42/107/116 doc-sync pattern: a durable canonical doc lagging a shipped code change.

## Approach (files / patterns)

`docs/SCHEMA.md` line 5 only — replace "via `zod-to-json-schema`" with "via Zod 4's native
`z.toJSONSchema`, in `content-schema/src/json-schema.ts` — the unmaintained `zod-to-json-schema` dep it
replaced was removed in SPEC-16". One sentence; no other doc text changes.

**Out of scope (deliberate):** `docs/TICKETS.md:39` also names `zod-to-json-schema`, but TICKETS.md is a
**historical ticket log** (records what a T-series ticket's DoD said at the time) — editing it would be
revisionism, not doc-sync. Left intact. (Recorded here so the next audit doesn't re-flag it.)

## DoD + acceptance

- [ ] SCHEMA.md no longer presents `zod-to-json-schema` as the live export mechanism; it names the
      native `z.toJSONSchema` + the SPEC-16 removal.
- [ ] `grep -rn zod-to-json-schema docs/SCHEMA.md` → 0 hits (the only remaining repo references are the
      historical TICKETS.md line + the SPEC-16/this-spec plan notes).
- [ ] `pnpm verify` EXIT 0 (docs-only; markdown is prettier-ignored via `.prettierignore **/*.md`, so the
      format gate — and the whole chain — is provably inert to the change; SPEC-116 precedent).
- [ ] golden-master untouched; no code change.

## Test strategy

None (docs-only). The gate is `pnpm verify` EXIT 0 (inert by the prettier-ignore reasoning above) plus
the grep check. Verified facts behind the fix: `json-schema.ts` uses `z.toJSONSchema`; `zod-to-json-schema`
is in 0 package.json + 0 pnpm-lock lines.
