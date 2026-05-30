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
| 4 | `content/generated/pack.the_drip_patrons` | Pipeline-authored patrons and related social density for The Drip. | Generated/curated pack |

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
