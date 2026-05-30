# /plan/BLOCKED.md — deferred items (reason + when to revisit)

Items marked `[!]` in PROGRESS land here with WHY. The loop never halts on these — defer, take the next task.
Distinct from [BACKLOG.md](BACKLOG.md) (unblocked-but-not-yet-specced ideas): BLOCKED = genuinely can't proceed
reversibly/unattended right now.

| Item | Reason blocked | Revisit when |
|------|----------------|--------------|
| Real multi-model generation (`pipeline:cycle/bake` end-to-end) | Needs `OPENROUTER_API_KEY` — a paid/secret service; AFK guardrail forbids spending + secret use unattended. StubProvider is the hermetic substitute. | A human provides the key + explicitly authorizes a paid run. |
| Persona-diverse critics; multi-hop context-context contradiction detection | Only pay off with a real model (above); hermetic stubs can't validate the quality claim. | After real generation is unblocked. |
| `git push` to origin | `.claude/settings.json` denies agent push (unattended safety net). Local commits only. | A human runs `! git push` or explicitly authorizes a push (as in the Cycle-1–3 push, 2026-05-30). |
| Vite 7 → 8 | Major; no forcing function (Vitest 4 runs on Vite 7); Rolldown not yet 1.0. Reversible later. | A 7.x patch line is exhausted or a v8 benefit emerges. |
| TS 7 / `tsgo` as the AUTHORITATIVE gate | Emit/watch pipeline still maturing mid-2026; tsc stays canonical. (tsgo already adopted as the *accelerator*, SPEC-29.) | tsgo emit/watch is GA + byte-identical diagnostics on this repo. |
| SPEC-35 — Drip Market reachable from the opening district | The loader's referential-integrity pass validates `exit.toLocationId`, so an exit in `pack.opening` → `location.drip_market` makes `pack.opening` un-loadable in isolation (it would depend on a pack that depends on *it*). That breaks every test loading `pack.opening` alone (replay-fuzz, model-based, cycle, …). Forcing those ~8 specs to co-load drip_market degrades their isolation. Reverted cleanly (2026-05-30). | A **reachability design decision** (Cycle 5): e.g. (a) move the drip_market *locations* into the base/opening pack (NPCs/quest/storylets can stay in drip_market), or (b) add a "world-graph" assembly layer that wires cross-pack exits at load without forcing reverse deps. Then the exit + `flag.met_marrow` Ink trigger become a clean follow-up. |
