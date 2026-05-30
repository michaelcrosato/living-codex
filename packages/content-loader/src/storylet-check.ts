import type { Condition } from "@codex/content-schema";

/**
 * Best-effort STATIC unsatisfiability check for a storylet's preconditions (SPEC-25).
 *
 * A storylet's `preconditions` are implicitly AND-ed (the engine's `evaluateAll`), so a storylet
 * whose conjunction can never simultaneously hold is **dead content** — it can never fire. The
 * loader's referential-integrity pass cannot see this (every id resolves); this catches the common
 * authoring mistakes that make a storylet silently unreachable.
 *
 * This is a deliberate HEURISTIC, not a SAT solver. It:
 *   - flattens the top-level conjunction and any nested `all` into a flat conjunct list;
 *   - flags a `flag_is` required to equal two different values;
 *   - flags a `flag_is(f, v)` together with its direct negation `not flag_is(f, v)`.
 * It intentionally does NOT reason about `any`, nested `not` beyond one level, numeric ranges, or
 * cross-condition implications — those are out of scope (documented limits; favour no false positives).
 *
 * Returns a human-readable contradiction reason, or `null` if none is detected.
 */
export function unsatisfiablePreconditions(preconditions: readonly Condition[]): string | null {
  // Flatten the AND: the top-level list plus any nested `all` lists are all conjuncts that must hold.
  const conjuncts: Condition[] = [];
  const stack: Condition[] = [...preconditions];
  while (stack.length > 0) {
    const c = stack.pop();
    if (!c) continue;
    if (c.kind === "all") stack.push(...c.of);
    else conjuncts.push(c);
  }

  const mustEqual = new Map<string, boolean | number | string>();
  const mustNotEqual = new Map<string, Set<boolean | number | string>>();

  for (const c of conjuncts) {
    if (c.kind === "flag_is") {
      const prev = mustEqual.get(c.flag);
      if (prev !== undefined && prev !== c.equals) {
        return `flag "${c.flag}" must equal both ${JSON.stringify(prev)} and ${JSON.stringify(c.equals)} — never satisfiable`;
      }
      mustEqual.set(c.flag, c.equals);
      if (mustNotEqual.get(c.flag)?.has(c.equals)) {
        return `flag "${c.flag}" must equal ${JSON.stringify(c.equals)} and also NOT equal it — never satisfiable`;
      }
    } else if (c.kind === "not" && c.of.kind === "flag_is") {
      const f = c.of.flag;
      const v = c.of.equals;
      if (mustEqual.get(f) === v) {
        return `flag "${f}" must equal ${JSON.stringify(v)} and also NOT equal it — never satisfiable`;
      }
      let set = mustNotEqual.get(f);
      if (!set) {
        set = new Set();
        mustNotEqual.set(f, set);
      }
      set.add(v);
    }
  }
  return null;
}
