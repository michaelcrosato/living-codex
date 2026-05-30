# content/core

Hand-authored 'vanilla' content packs (the control). pack.opening holds the vertical-slice base; the narrative-thread packs (`syndicate_offer`, `kestrel`, `varga_trust`, `clinic`, `lost_thread`, `street_kid`) overlay quests, dialogues, storylets, and reactions onto its geography, and `district_barks`/`drip_market` add ambient and market content. Loaded through the identical path as generated content. The authoritative load order is `content/PACKS.md`.

## Pack layering (geography vs. content)

Packs compose via `dependsOn`, but the loader (and several tests) run on **subsets** — `pack.opening` is loaded _alone_ by the replay-fuzz — and referential integrity is enforced against whatever subset loads. So a base pack must be **self-contained**: a location that is the target of an `exit` (or any cross-pack reference) must live in the **base** pack as shared _geography_, while a dependent pack overlays only the _content_ (NPCs, quests, dialogues, storylets) that populates it. Example: the Drip Market's locations live in `pack.opening`; `pack.drip_market` overlays the vendors, quest, and barks. See `docs/SCHEMA.md` (referential-integrity pass) and SPEC-35.
