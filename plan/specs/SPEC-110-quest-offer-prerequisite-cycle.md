# SPEC-110 — Playability guard: quest-offer prerequisite cycles (temporal-causal consistency)

**Wave:** Cycle-10 P1 (gate causal-consistency) · **Risk:** LOW (warning-only) · **Status:** Todo

## Description + Impact

REPLENISH research (2026): SNAP (arxiv 2601.11529) and the temporal-causal-KG line identify a key
failure mode of generated narrative — **"characters reference events that haven't occurred yet"**, i.e.
broken temporal causality. The deterministic analog in this content model is a **quest-offer
prerequisite cycle**: a `quest_completed(P)` condition in quest `Q`'s `offerWhen` means *Q can only be
offered after P completes*. If P's `offerWhen` in turn requires `quest_completed(Q)` (directly or
transitively), the quests in the cycle can never be offered — no causal ordering exists.

The gate guards `flag_is` (SPEC-70) and `has_item` (SPEC-105) gate satisfiability and contradictory
`offerWhen` flags, but **not** `quest_completed` offer-ordering. `quest_completed` is a real, used
condition (district_barks / drip_market — though today only in storylet/reaction contexts, not
`offerWhen`); quest chaining via prerequisites is a natural pattern a generator will emit.

**Soundness — the `start_quest` bypass (verified `apply.ts:187`):** a `start_quest` *effect* sets a
quest `active` directly, **skipping `offerWhen`**. So an offerWhen cycle is only genuinely unsatisfiable
if **no** quest in it is the target of a `start_quest` effect. The check must exclude start_quest-
reachable quests, else it false-positives. Edges are also only "hard" prerequisites when the
`quest_completed` sits on an **all-path** of `offerWhen` (top-level or nested only through `all`) — under
`any` it's optional, under `not` it's an anti-requisite; neither is a hard edge.

Warning-level (subset-safe — a `start_quest` could live in a not-yet-loaded pack; like SPEC-60/70/105).

## Approach (files / patterns)

`packages/content-loader/src/playability.ts`, new pass:
1. `startable: Set<QuestId>` = every `start_quest` effect target (scan the same effect sites as the
   SPEC-104 item pass: quest.onAnyComplete / branch.onComplete/onFail / skill_check.onFail /
   storylet.effects).
2. `prereq: Map<QuestId, Set<QuestId>>` from each quest's `offerWhen` via a hard-prereq collector
   (`quest_completed` → add; `all` → recurse; `any`/`not`/leaf → stop).
3. 3-colour DFS over `prereq`; on a back-edge to a GRAY node, extract the cycle from the path stack;
   if **no** quest in the cycle is in `startable`, push a warning (de-duped by sorted cycle key). Handles
   self-loops (Q requires quest_completed(Q)).

## DoD + acceptance

- [ ] A 2-quest offerWhen `quest_completed` cycle → warning; a self-loop → warning.
- [ ] No warning when a quest in the cycle is a `start_quest` target (bypass breaks it).
- [ ] No warning when the `quest_completed` is under `any` or `not` (not a hard prerequisite).
- [ ] No warning on an acyclic chain (A requires B, B requires C).
- [ ] `pnpm content:verify` reports 0 new warnings on the real packs (no offerWhen quest_completed today).
- [ ] `pnpm verify` EXIT 0; golden untouched; `pnpm audit` clean.

## Test strategy

`playability.test.ts`: cycle→warn; self-loop→warn; start_quest-broken→no warn; under-any→no warn;
under-not→no warn; acyclic chain→no warn; assert `errors` empty (warning-only). Real-content clean via
`content:verify`.
