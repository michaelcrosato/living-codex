# CONTENT_PIPELINE.md — Pipeline B (The World)

How the world is grown. This is **offline**, **human-guided**, **multi-model**, and produces **static validated content packs**. It never runs during gameplay and never ships to the browser. It lives in `tools/pipeline/`.

Read `GOAL.md §3` (scope decisions) and `SCHEMA.md` (the treaty) first. The pipeline's only job is to emit packs that pass `pnpm content:validate`.

---

## 1. Principle: curated depth, not procedural filler

Procedural generation existed because LLMs didn't. We don't need it. Instead we run a deliberate, high-signal cycle: **propose with multiple frontier models → a human curates → validate → bake in.** Every addition is chosen for quality and canon-fit. The result feels hand-crafted because, in the way that matters, it is.

**On volume, honestly:** human curation is a real bottleneck, so we do not promise "infinite content with zero effort." What we promise is that a small amount of human *taste* is leveraged across a large amount of AI *labor* — one operator can curate far more quality content per day than they could write. As trust in a content type grows, curation can move from line-by-line approval to **spot-check sampling above a quality threshold**, raising throughput without abandoning the taste layer. The honest claim is "curated depth that comfortably outpaces a solo writer," not "faster than any player can ever consume."

Players never see this machinery. They see permanent, coherent content.

---

## 2. The cycle (run daily, or on a milestone)

```
1. EXPORT CANON      pnpm pipeline:export
   → compact world-bible summary + current entity index (IDs, names, one-liners)
   → this is the grounding context every model receives

2. PROPOSE (multi-model, parallel)
   → same brief sent to several frontier models, each playing to its strength
   → each returns SCHEMA-VALID JSON proposals (structured output, constrained
     by the JSON Schema exported from content-schema)

3. CRITIQUE (cross-model)
   → models score each other's proposals on: canon consistency, choice density,
     emotional stakes, novelty, integration cost
   → produces a ranked shortlist + flagged contradictions

4. CURATE (human)
   → operator reviews the shortlist side by side in the review UI
   → selects, lightly edits, rejects; this is the taste layer and it is required

5. VALIDATE
   → Zod + JSON-Schema validation
   → referential-integrity check against existing canon (no dangling IDs)
   → contradiction check against the world bible (see §6)

6. BAKE
   → approved content written to content/generated/pack.<name>/ with provenance
   → world bible updated with the new canon
   → committed to version control; the game now contains it, permanently
```

Steps 1–3 and 5 are automated. Step 4 is the human. Step 6 is a commit.

---

## 3. Multi-model roles (configurable, not hardcoded)

Use an ensemble; do not depend on any one vendor. Suggested role assignment (swap freely as models change):

| Role | What it does | Typical strength |
|------|--------------|------------------|
| **Architect** | Plots the arc: beats, branches, stakes, where player agency lives | structured plotting / logical consistency |
| **Dramatist** | Writes prose, character voice, dialogue, subtext | nuanced, human-sounding prose |
| **Loremaster** | Grounds everything in canon; holds the whole world bible in context | long-context grounding |
| **Wildcard** | Injects surprising but on-theme ideas | creative divergence |
| **Critic** | Scores and red-teams all proposals for contradictions and flatness | careful evaluation |

The pipeline calls each role through **one provider-agnostic adapter** (`tools/pipeline/src/llm/adapter.ts`) with a `generateStructured<T>(schema, prompt)` signature. One file per provider implements it. The brief, the schema, and the canon are identical across models; only the role instruction differs.

> **Vendor isolation mirrors the engine's rule.** Swapping models, or moving to local models in 2–3 years, is a one-file change. The pipeline's logic never names a vendor.

---

## 4. Agentic decomposition (one proposal, several sub-tasks)

A single "propose a new quest line" brief decomposes into typed sub-tasks, each schema-constrained:

```
brief ─► Architect: arc skeleton (beats + branch outline)         → ArcSkeleton JSON
      ─► Loremaster: which existing NPCs/factions/locations to use → ReferenceSet JSON
      ─► Dramatist: NPC bios + dialogue (Ink source)               → Npc[] + Ink
      ─► Architect: quest objectives + effects + conditions        → Quest JSON
      ─► Critic: consistency + agency + stakes scorecard           → Scorecard JSON
      ─► synthesis: assemble into a candidate ContentPack          → ContentPack JSON
```

Each arrow is a structured-output call validated immediately. A sub-task that fails validation is **repaired** (re-prompted with the validation error) up to N times, then surfaced to the human as "needs attention" rather than silently dropped.

---

## 5. The brief format

A brief is a short human-written (or template-filled) instruction that seeds a cycle. Example:

```yaml
intent: "Introduce a rival fixer who competes with Varga for the player's loyalty."
constraints:
  - "Must fit the Ashfall district established in pack.opening."
  - "Player must be able to side with either fixer or play them against each other."
  - "At least 3 viable solutions to the introductory quest."
ground_in:
  - faction.varga_crew
  - faction.ashfall_syndicate
  - location.ashfall_district
budget:
  npcs: 3
  quests: 1
  locations: 1
tone: "noir, terse, morally grey"
```

The pipeline injects the canon export + the relevant schema(s) and dispatches to the ensemble.

---

## 6. Canon consistency (the hard part, kept practical for now)

The risk in growing a world is contradiction over time. For the slice and the near term, three lightweight mechanisms keep it coherent:

1. **The world bible is the source of truth** (`WORLD_BIBLE.md` + a generated index). Every cycle is grounded in it; nothing is proposed without it in context. Content conditions on **Possible Outcomes**, never on one player's branch (`WORLD_BIBLE.md §A.3`).
2. **A canon index** (`content/canon-index.json`, auto-generated) lists every entity ID, its name, and a one-line summary. It is small and fits easily in context, so models avoid reinventing or reusing IDs.
3. **A contradiction check at validation time.** The Critic role receives the new pack + the canon index and answers a structured question: *does anything here contradict established canon (deaths, allegiances, established facts)?* Flagged contradictions block the bake until the human resolves them.

Dependency tracking is data-driven: each pack declares `dependsOn`, and the canon index records which packs introduced which entities, so the human sees blast radius before changing canon.

> **Honest limitation (deferred, by design).** The canon index is **ID-level**: it stops you reusing or contradicting an *identifier*, but it cannot by itself catch *semantic/relational* contradictions — "Varga is secretly broke" in one pack vs. "Varga quietly funds the Syndicate" in another, or an NPC killed in pack A greeting the player in pack F. The Critic pass + human curation catch most of these at slice scale. The real long-term fix is to store canon as **structured assertions** (entity → relation → entity, with status-over-time, mirroring the Events log) that a check can *query*, rather than prose a Critic eyeballs. That is a deliberate **post-slice** work item — it degrades gracefully (curation covers it meanwhile) and does not block the showcase. Do not build the assertion graph before the slice ships.

---

## 7. Provenance & auditability

Every generated pack records, per `SCHEMA.md §8`: which models proposed it, the prompt hash, who approved it, and when. This means months later anyone can see how a piece of the world came to be — and a regression can be traced to a specific cycle.

---

## 8. Output contract

The pipeline's only deliverable is files under `content/generated/` that:
- validate against `content-schema`,
- pass referential integrity against current canon,
- carry complete provenance,
- load through the **exact same `content-loader` path** as hand-authored `content/core/`.

If the engine ever needs to special-case generated content, the schema is wrong — fix the schema, not the engine (`GOAL.md §4`, milestone criterion).

---

## 9. What the pipeline is NOT

- Not a runtime system. It never executes during play.
- Not procedural generation. No noise functions, no template-mad-libs as the primary mechanism.
- Not a single-model wrapper. The ensemble + human curation is the quality engine.
- Not coupled to a vendor. Adapters isolate every provider.
- Not the engine's concern. The engine knows only the schema.
