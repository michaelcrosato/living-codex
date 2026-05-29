# WORLD_BIBLE.md — Canon & The Starter Setting

The world bible is the **source of truth for canon** (`CONTENT_PIPELINE.md §6`). It is grounding context for every content cycle and the reference a human curator checks against. Keep it tight — it must fit comfortably in a model's context alongside a brief and a schema.

Two parts: (A) the **format** the bible always follows, and (B) the **starter setting** for the showcase slice, written to spec so the agent and the pipeline have a concrete world from day one.

---

## A. Format (how canon is recorded)

### A.1 Layers
1. **Premise** — 3–5 sentences. The unchanging frame of the world.
2. **Pillars** — the handful of themes/rules that everything must honor (tone, what's possible, what isn't).
3. **Places** — each location's one-paragraph identity.
4. **Powers** — factions: ethos, goals, rivalries.
5. **People** — principal NPCs: who they are, what they want, their secrets, current status.
6. **Events** — append-only log of what has happened in canon (so nothing contradicts it later).

### A.2 The canon index (generated, not hand-written)
`content/canon-index.json` is auto-built from all loaded packs: every entity ID, its display name, type, the pack that introduced it, and a one-line summary. This is the compact list every model sees so it never reinvents or contradicts existing canon. Regenerate it with `pnpm pipeline:export`.

### A.3 Four kinds of "fact" (don't let one player's branch become everyone's canon)
A branching RPG has multiple valid playthroughs. A player who forced the warehouse and one who talked their way in **cannot both** make their route global truth. So canon is layered:

- **Global Canon** — fixed facts true for every player and every save (the premise, who exists, established history). Only this layer lives in the world bible and feeds content cycles.
- **Runtime Facts** — flags, reputation, quest outcomes for *one* player; they live in that player's `World` save, never in the bible.
- **Possible Outcomes** — documented branch results that *future content may condition on* (e.g. "the player may have entered peacefully OR by force"). Content references these as conditions, not as settled fact.
- **Canonical Timeline** (optional) — a single chosen path, used only for marketing/demo continuity, never assumed by gameplay content.

Generated content must condition on **Possible Outcomes** (via the condition language), never assume one player's branch happened.

### A.4 Rules for editing canon
- New content **adds** to Global Canon's Events; it does not rewrite history.
- Changing an established fact (a death, an allegiance) requires a human decision and a check of dependents via the canon index.
- Status of a person/place can change over time, but the change is recorded as an Event, not a silent edit.

---

## B. Starter Setting — "Ashfall" (for the slice)

Deliberately small and noir so the 10-minute demo lands. Sci-fi-leaning but grounded; expandable in any direction later.

### B.1 Premise
Ashfall is one weather-sealed district of a sprawling arcology city, perpetually under acid rain. The municipal authority withdrew years ago; now fixers, syndicates, and crews run the streets through favors, debt, and force. You arrive with no memory of how you got here and a city that already seems to know your name.

### B.2 Pillars
- **Noir, terse, morally grey.** No clean heroes. Every choice costs something.
- **Agency over spectacle.** Most problems have at least three solutions (talk, sneak, force, or something cleverer).
- **The world remembers.** NPCs react to what you've done. Reputation cascades.
- **No magic system in the slice.** Tech and leverage, not spells. (A later pack could add one via an engine ticket — not before.)

### B.3 Places (slice scope)
- **`location.ashfall_district`** — Rain-slick street of neon storefronts under a sagging awning-line. The hub. Entry point.
- **`location.the_drip`** — A cramped bar; warm light, suspicious patrons. Where most NPCs gather.
- **`location.warehouse_door`** — The guarded front of the Ashfall Syndicate warehouse.
- **`location.warehouse_roof`** — A way in for the quiet type.
- **`location.warehouse_floor`** — What you came for is here.

### B.4 Powers (slice scope)
- **`faction.varga_crew`** — Small, scrappy, loyal-if-you're-loyal. Run by Varga. Wants leverage over the Syndicate.
- **`faction.ashfall_syndicate`** — Old money and muscle. Controls the warehouse and most of the debt in the district. Rival to Varga's crew.

### B.5 People (slice scope — principals; the pipeline fleshes the rest)
- **`npc.varga`** — Dock-side fixer, quietly desperate. *Wants:* the encrypted drive in the Syndicate warehouse. *Fears:* her crew finding out how deep she's in debt. *Voice:* clipped, warm under the wariness. The quest giver.
- **`npc.warehouse_guard`** — Syndicate muscle, bored and underpaid. *Wants:* to get through the shift. Persuadable, sneakable-past, or beatable. The three-solution gate.
- **`npc.stranger`** — The cold-open contact who pulls you off the street. Sets mood, hands you to Varga. *Secret:* knows more about your missing memory than they let on (a hook, not resolved in the slice).
- **8–12 bar patrons** — **authored by the content pipeline**, not hand-written. Each gets a name, role, one-line want, and a short greeting that may reference world state. One of them seeds the warehouse rumor. This batch is the proof that Pipeline B works (`GOAL.md §4`).

### B.6 Events (Global Canon log — starts almost empty)
- The municipal authority abandoned Ashfall ~6 years ago. (premise)
- Varga's crew and the Syndicate have an uneasy non-aggression that is fraying. (premise)
- *(Player choices do NOT append here — they are Runtime Facts in the save, §A.3. Only world-level developments authored by a content cycle become Global Canon Events.)*

### B.7 Flags the slice uses (world-state keys)
`flag.met_stranger`, `flag.met_varga`, `flag.accepted_warehouse`, `flag.entered_peacefully`, `flag.has_drive`, plus per-NPC `flag.met_<npc>` set on first conversation.

---

This bible is intentionally a seed. Its whole point is that the pipeline can grow it indefinitely — a rival fixer, a third faction, the truth about your memory, a second district — each as a curated pack that honors the Pillars and extends the Events log without contradicting it.
