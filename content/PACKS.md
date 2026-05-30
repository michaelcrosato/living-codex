# Content pack catalog

Snapshot date: **2026-05-30**.

This file is the authoritative human-readable catalog of committed content packs. It exists to prevent
runtime imports, docs, and generated content notes from drifting apart. Keep it in sync with
`packages/app-web/src/main.ts` and content validation results.

---

## Default browser pack set

The browser app currently loads these packs in `packages/app-web/src/main.ts`, in this order:

| Order | Pack path | Role | Source |
|---:|---|---|---|
| 1 | `content/core/pack.opening` | First Light base geography, principal slice entities, initial quest content. | Hand-authored core pack |
| 2 | `content/core/pack.district_barks` | Ambient/reactive district storylets and flavor. | Hand-authored core pack |
| 3 | `content/core/pack.drip_market` | The Drip/market overlay content. | Hand-authored core pack |
| 4 | `content/core/pack.syndicate_offer` | The Syndicate recruitment arc — broker & cleaner NPCs, recruit/contract quests, decrypt & leverage payoff storylets, and the fully-Syndicate convergence. | Hand-authored core pack |
| 5 | `content/core/pack.kestrel` | Kestrel rival-loyalty thread — the sided-with / refused / played-both reactions and their payoffs. | Hand-authored core pack |
| 6 | `content/core/pack.varga_trust` | Reputation-gated Varga follow-up quest and the fully-Varga convergence storylet. | Hand-authored core pack |
| 7 | `content/core/pack.clinic` | Ashfall clinic — debt-resolution quest, medic faction reactions, skill-training progression. | Hand-authored core pack |
| 8 | `content/core/pack.lost_thread` | The amnesia/origin thread — recovering who the player was before Ashfall. | Hand-authored core pack |
| 9 | `content/core/pack.street_kid` | The "Someone's Brother" thread — the street kid and its truth/payoff beat. | Hand-authored core pack |
| 10 | `content/generated/pack.the_drip_patrons` | Pipeline-authored patrons and related social density for The Drip. | Generated/curated pack |

---

## Non-default packs

Committed but **not** in the default browser set above:

| Pack path | Role |
|---|---|
| `content/core/pack.bribe_demo` | Minimal demo exercising the `bribe_faction` effect; loaded only by its tests, not the browser app. |

---

## Rules

- A default-loaded pack must pass `pnpm content:validate` and `pnpm content:verify` with the other default packs.
- A base pack that can be loaded alone must be self-contained: any location, exit, NPC, item, faction,
  dialogue, quest, storylet, or assertion reference it carries must resolve within the loaded subset.
- Generated packs must include provenance and load through the same `content-loader` path as hand-authored packs.
- Do not special-case generated content in engine code. If a pack needs a new behavior, add a schema/event/system
  ticket first.
- When `packages/app-web/src/main.ts` changes its default imports, update this file, `README.md`, `STRUCTURE.md`,
  and any affected roadmap/status docs in the same change.

---

## Known follow-up

This is currently a manually maintained catalog. The next repo-health step is a script that derives the default
pack set from `packages/app-web/src/main.ts` and fails or warns when docs drift from runtime imports.
