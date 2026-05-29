# SPEC-12 — Tolerant pre-parser before counting a repair attempt

- **Status:** Todo · **Pillar:** Pipeline (offline) · **Wave:** 1 · **Priority:** P=12
- **I**=3 **F**=5 **R**=1 **Ft**=5

## Description
`generateStructured` (`tools/pipeline/src/llm/adapter.ts`) currently does `extractJson` (strip ```json fences)
→ `JSON.parse` → on failure, **re-prompt** (an expensive extra model call). 2026 best practice (BAML's
Schema-Aligned Parsing) is to run a **tolerant pre-parse** first — recovering the common, cheap-to-fix
malformations (chain-of-thought prefix/suffix prose, trailing commas, smart quotes, a single object embedded in
prose) **without** spending a repair round. Provider-portable, fully offline. (Research:
[BAML structured output](https://boundaryml.com/blog/structured-output-from-llms).)

## Acceptance Criteria
- A pure `tolerantParse(raw: string): unknown` (or hardened `extractJson`) that recovers, before any re-prompt:
  fenced JSON (already), JSON object/array embedded in leading/trailing prose (balanced-brace/bracket
  extraction), trailing commas, and a leading CoT prefix. It throws only when no JSON value is recoverable.
- `generateStructured` uses it so a *recoverable* first response **validates without consuming a repair
  attempt**; genuinely invalid/incomplete output still triggers the existing repair loop and finally
  `StructuredGenerationError` (unchanged contract: returns `z.output<S>`, throws after N attempts).
- **No new dependency** (hand-rolled; do not add a parser lib without explicit justification — keep the offline
  tree lean).
- Hermetic tests with a `StubProvider` that returns deliberately messy-but-recoverable strings prove they parse
  on the **first** attempt (assert the provider was called once); a truly invalid stub still repairs then throws.
- `pnpm verify` green. **Golden-master unaffected** (StubProvider returns clean JSON in the cycle path, so the
  byte-stable pack is unchanged) — confirm by running `tools/pipeline/src/cycle.test.ts`.

## Implementation approach
Read `adapter.ts` (esp. `extractJson`, the repair loop) and `tools/pipeline/src/llm/stub.ts`. Replace/extend
`extractJson` with `tolerantParse`: try `JSON.parse(raw)`; else strip fences; else regex-extract the first
balanced `{...}`/`[...]`; else strip a trailing-comma; parse again. Keep it small and total. Call it where
`JSON.parse(extractJson(...))` is today. Add a spy/counter to `StubProvider` (or count calls) for the
"first-attempt" assertion.

## Files
- `tools/pipeline/src/llm/adapter.ts` (+ `adapter.test.ts`). Read-only: `tools/pipeline/src/llm/stub.ts`,
  `tools/pipeline/src/cycle.test.ts`.

## Dependencies / prereqs
None. Pure offline tooling. Independent of all other specs.

## Test strategy
Unit: a table of messy inputs (prose-wrapped, trailing comma, fenced, CoT-prefixed) → all parse; an
unrecoverable input → repairs/throws. Call-count assertion proves repairs are *avoided* for recoverable cases.
Run the golden-master test to confirm no drift.

## Effort
S (~1 hr).

## Out of scope
Provider-native strict/JSON-schema modes (provider-specific; we're provider-agnostic); semantic ("wrong-value")
validation (that's the canon graph + SPEC-15 judge); adding `instructor`/`outlines`-style deps.
