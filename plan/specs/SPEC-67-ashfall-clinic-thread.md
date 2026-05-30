# SPEC-67 — New thread: the Ashfall back-alley clinic (new geography + a neutral beat)

**Wave:** Cycle-7 / C7-P2 (net-new content breadth — a genuinely new thread, not a parallel of existing).
**Risk:** LOW-MED (adds new geography to pack.opening + a new pack; additive; wires live). Reversible.

## Description + Impact
Every current thread is faction-allegiance (Varga / Syndicate / Kestrel). This adds a **new location and a
neutral, self-contained beat**: a back-alley clinic ("The Patch-Up") reachable from the hub, run by a medic
who is nobody's — a different *kind* of content (a service/debt vignette, not a loyalty choice) that broadens
the vertical slice's geography and tone. It exercises new geography wiring (the SPEC-35/42 layering rule:
the location lives in the base pack; the NPC/quest/dialogue overlay from a dependent pack) end-to-end.

## Files (in scope)
- `content/core/pack.opening/pack.json` — add `location.ashfall_clinic` (base geography) + an
  `ashfall_district → ashfall_clinic` exit (layering rule: cross-pack exit target lives in the base pack).
- `content/core/pack.clinic/pack.json` (new) + `content/core/pack.clinic/ink/clinic_medic.ink` (new).
- `packages/app-web/src/main.ts` (+ `packages/app-web/test/live-packs.spec.ts`) — wire live, keep lockstep.
- `packages/app-web/test/clinic.spec.ts` (new) — same-path load + reachability + play.

## Out of scope
- A new faction (the medic is neutral — `faction` omitted). New verbs (uses reach/talk_to/skill_check/set_flag/
  adjust_reputation/give_item). Editing generated packs.

## Design
- **Geography (pack.opening):** `location.ashfall_clinic` (name "The Patch-Up", bounds 400×300, minimal rect
  art, exit back to `ashfall_district`), reachable via a new district exit (`spawnAt` inside the clinic).
- **pack.clinic (dependsOn opening):** `npc.clinic_medic` ("Sister Vane", neutral, `homeLocationId:
  location.ashfall_clinic`, `dialogueId: dialogue.clinic_medic`); Ink sets `met_medic`. `quest.clinic_debt`
  ("Bad Blood", giver medic, `offerWhen: [flag_is met_medic == true]`): a supplier stiffed her — recover what's
  owed. Branches: `lean_on` (talk_to + reach drip_market + skill_check force), `talk_down` (talk_to + reach +
  skill_check persuade). `onAnyComplete: set_flag clinic_debt_resolved`; rewards credits. Canon assertions
  (`located_in` medic→clinic, `status` alive, `fact`).
  - **Finding (during impl):** an initially-planned 3rd `let_it_go` branch with ONLY a `talk_to` objective
    **auto-completed and shadowed** the other branches — `questSystem` completes any active branch whose
    objectives are all done, and `talk_to` is satisfied the moment the player engages the giver's dialogue, so
    the trivially-complete branch always won. Removed it (declining = simply not pursuing the quest; all
    existing multi-branch quests give every branch a player-driven `skill_check`/`reach`). Filed the
    "auto-completing branch shadows siblings" rule to BACKLOG as a future `staticPlayabilityCheck` guard.

## DoD + Acceptance
- [ ] `content:validate`/`content:verify` OK — solvable, **clinic reachable** from the start, canon-consistent,
      0 hygiene warnings. `pack.opening` still loads in isolation (replay-fuzz green — the clinic geography is
      self-contained in opening, content overlays from pack.clinic).
- [ ] `content:compile-ink content/core/pack.clinic` compiles `dialogue.clinic_medic`; it plays (sets `met_medic`).
- [ ] `clinic.spec.ts`: pack.clinic loads same-path alongside opening; the medic spawns at the clinic
      (`entity.npc.clinic_medic` @ `location.ashfall_clinic`); the Ink plays; the quest offers on `met_medic`
      and a branch completes end-to-end.
- [ ] `pnpm verify` green; production build green; `pnpm e2e` 4 passed; pipeline golden untouched; audit clean.

## Test strategy
Model on `syndicate-offer.spec.ts` + the SPEC-59 spawn check: `loadPacks([clinic, opening])`; assert registry
membership + the medic's `homeLocationId`; a `GameSession` started at `location.ashfall_clinic` spawns
`entity.npc.clinic_medic` there; drive the Ink via `InkNarrative`; offer-gate the quest on `flag.met_medic`
(ActivateQuest path) and complete `talk_down` through `questSystem` with consequences.
