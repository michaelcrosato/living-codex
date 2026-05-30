# SPEC-63 — Make the dockhand's warehouse rumor an actionable lead (complete patron integration)

**Wave:** Cycle-7 / C7-P1 (content integration). **Risk:** LOW (additive storylet; no engine/schema change;
no edit to the generated pack). Reversible.

## Description + Impact
Completes the "make the reachable patrons matter" work (SPEC-59 placed them; SPEC-62 integrated the
Archivist). `npc.drip_rumor` (off-shift dockhand, "wants to sell what she knows before someone buys her
silence") sets `heard_warehouse_rumor` in her Ink — a **designed hook** (a lead to the warehouse job) that
pays off nowhere. This adds a fire-once storylet that makes the rumor land as an actionable lead: it fires
when the player has **heard the rumor** but does **not yet have the drive** (`heard_warehouse_rumor ∧
¬has_drive`) — the lead is fresh/actionable before the warehouse is done, and moot after. After this, the two
patrons with explicit thread-hooks (Archivist → drive, dockhand → warehouse lead) are both integrated; the
other 8 are intentionally pure ambiance.

Lives in the hand-authored `pack.syndicate_offer`, keyed on the flag her Ink already sets — integrating the
generated NPC's intent WITHOUT editing `pack.the_drip_patrons` (provenance preserved). No new verb (GOAL §3).

## Files (in scope)
- `content/core/pack.syndicate_offer/pack.json` (one `Storylet`).
- `packages/app-web/test/syndicate-offer.spec.ts` (GameSession firing test).

## Out of scope
- Editing `pack.the_drip_patrons`. Integrating the other 8 (hook-less) patrons — they are ambiance by design.
- A full rumor quest / new verb.

## Design
`storylet.warehouse_rumor_lead` in `pack.syndicate_offer`:
- `preconditions: [flag_is heard_warehouse_rumor == true, not(flag_is has_drive == true), not(flag_is bark_rumor_lead_seen == true)]`
- `salience: 4`, `tags: []` (unaffiliated).
- `content.ambient`: the rumor sinking in as a lead toward the Ashfall warehouse.
- `effects: [set_flag bark_rumor_lead_seen → true]` (fire-once).

## DoD + Acceptance
- [ ] `content:validate`/`content:verify` OK — satisfiable, no orphan/unspawnable/contradiction warnings.
- [ ] `syndicate-offer.spec.ts`: with `heard_warehouse_rumor` seeded (and no `has_drive`) the storylet is an
      eligible candidate, fires once, session replays identically; with `has_drive` also set it does NOT fire.
- [ ] `pnpm verify` green; test count rises; golden untouched; `pnpm audit` clean.

## Test strategy
Mirror the SPEC-62 firing test (GameSession over `[opening, syndicate_offer]`, seed the flag, step/assert
candidate, step/assert gone, replay-hash equal); plus a negative case seeding `has_drive` to prove the
lead is gated off once the warehouse is done.
