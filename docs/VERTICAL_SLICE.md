# VERTICAL_SLICE.md — The 10-Minute "Wow"

The showcase. A first-time player opens a URL and within ten minutes thinks *"I want more."* This document is the **exact target** the engine and the first content pack are built toward. It is the definition of done for the first milestone (`GOAL.md §4`).

Setting: **Ashfall** (`WORLD_BIBLE.md §B`). Style: top-down, vector graphics, text-forward. No install, no login.

---

## 1. What the slice must prove

In ten minutes of play it demonstrates, without ever saying so:

1. **Mood from nothing.** Vector art + prose set a strong tone in under a minute — proving graphics aren't the point.
2. **A world, not a menu.** You move through a place, meet people, and they feel authored.
3. **Real agency.** One quest, **three viable solutions**, each with different consequences — all expressed as data (`SCHEMA.md §9`), none scripted.
4. **The world remembers.** A choice visibly persists: an NPC reacts later, reputation shifts, a line changes.
5. **The pipeline works.** Most NPCs you meet were authored by the offline pipeline and loaded through the same path as hand-authored content.
6. **The machine is clean.** Under the hood, the whole session is replayable from its event log (the agent can prove it).

---

## 2. The beat sheet

| Time | Beat | What the player does | What it proves |
|------|------|----------------------|----------------|
| 0:00 | **Cold open.** Black screen, vector rain falling. One line: *"You don't remember how you got here."* | Press any key. | Mood, instantly, with ~zero assets. |
| 0:30 | **The street fades in.** `location.ashfall_district` — neon rectangles, an awning, rain. Player is a simple shape. A `npc.stranger` waits under the awning. | Move (click/keys) toward the stranger. | Movement + vector scene + presence. |
| 1:00 | **First contact.** Ink dialogue: the stranger sizes you up — *"Lost. Or hunted. Hard to tell with your kind. Varga's looking for someone like you. The Drip. Go."* Two or three choices. | Choose a reply. Sets `flag.met_stranger`. | Branching dialogue changes tone of the reply. |
| 2:00 | **The Drip.** Enter `location.the_drip`. 8–12 patrons (**pipeline-authored**), each with a name and a one-line greeting; one mentions the warehouse rumor. Varga is at the back. | Wander, talk to a few patrons, then Varga. | Authored density. The bar feels populated and specific. |
| 3:00 | **The job.** Varga's conversation offers `quest.the_warehouse`: get the encrypted drive. *"Getting in is your problem. Talk, sneak, or kick the door — I don't care how."* | Accept. Sets `flag.met_varga`, `flag.accepted_warehouse`. | A quest enters the journal; agency is named up front. |
| 4:00 | **The approach.** Travel to the warehouse. The guard (`npc.warehouse_guard`) blocks the door. The quest exposes three branches. | Pick an approach. | The three-solution structure becomes tangible. |
| 5:00 | **Solution — talk.** Persuade check (DC 12) via dialogue choices that draw on what you learned in the bar. | Pass/fail the check. | Skill check as a condition on world state, not a cutscene. |
| 5:00 | **Solution — sneak.** Reach the roof, sneak check (DC 14), drop to the floor. | Stealth route. | Same goal, different path, different state. |
| 5:00 | **Solution — force.** Defeat the guard (simple turn resolution). Costs Syndicate reputation. | Fight. | Consequence: `adjust_reputation` fires. |
| 7:00 | **The payoff.** Reach `location.warehouse_floor`, take `item.encrypted_drive`. `flag.has_drive` set; branch-specific flags recorded (e.g. `flag.entered_peacefully`). | Grab the drive. | `onAnyComplete` + branch `onComplete` effects apply. |
| 8:00 | **The world reacts.** Back on the street, Varga's follow-up line changes based on *how* you did it. If you fought, a Syndicate patron in the bar now glares / refuses to talk. | Notice the difference. | Persistent consequence — the hook lands. |
| 9:30 | **The hook.** A second pipeline-authored NPC approaches: *"I heard what happened at the warehouse. The drive — you don't know what's on it, do you? Find me when you want the truth. About the drive. About you."* | End of slice. | Promise of depth → "I want more." |

> The three solutions all share the 5:00 slot because the player takes **one** of them. The slice ships all three so the demo can be replayed differently — which is itself part of the wow.

---

## 3. Minimum feature set (what the engine must support for the slice)

This is the floor for the first milestone. Tickets in `TICKETS.md` build to exactly this.

- **Render (vector):** rect, circle, path, text; a camera that follows the player. ~≤ a few dozen shapes per scene.
- **Movement:** top-down player movement; arrival at exits transitions locations.
- **Interaction:** proximity detection + "talk to" / "use exit" prompts.
- **Dialogue:** Ink runtime; choices mutate story vars mirrored into world flags.
- **Conditions:** evaluate the condition language so quests/exits/reactions gate correctly.
- **Quests:** offer-when gating, multi-branch objectives, completion detection, effects on complete.
- **Skill checks:** `persuade/sneak/force/tech` against a DC using the single seeded RNG.
- **Combat (minimal):** enough turn resolution to satisfy the `defeat` objective. Not a full combat system — a ticket may deepen it later.
- **Reputation:** per-faction standing in world state; `adjust_reputation` effect; NPC reactions gate on it.
- **Persistence/replay:** save/load world; event log; `replay(log, seed)` reproduces the session.

**Explicitly stubbed (interfaces only, no implementation):**
- **Audio/voice** — `AudioOut` is a no-op. Voice is a future plug-in.
- **Sprite/AI-image rendering** — `drawSprite` is a no-op. Vector only for the slice.

---

## 4. Content the slice needs (the first packs)

- **`content/core/pack.opening`** (hand-authored, the control): the 5 locations, the 2 factions, Varga, the stranger, the guard, the encrypted drive, `quest.the_warehouse`, and the principal dialogues. This proves a human can author against the schema.
- **`content/generated/pack.the_drip_patrons`** (pipeline-authored): the 8–12 bar patrons + the follow-up hook NPC, produced via `CONTENT_PIPELINE.md`, curated, validated. This proves Pipeline B and that both load identically.

---

## 5. The success test

Instrument the first ten minutes. The milestone passes if a majority of first-time testers, unprompted, want to keep playing — and if the team can point at the repo and show: *the agent built this engine from the tickets, and at least one quest line came through the content pipeline.* If testers bounce, the fix is **more and deeper content**, not more engine — generate more patrons, deepen the quest, enrich the bible. The engine is the floor; the world is the ceiling.
