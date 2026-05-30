## Summary

- 

## Scope

- Ticket / roadmap item:
- Files or areas intentionally touched:
- Files or areas intentionally avoided:

## Verification

Record exact commands and results. Use `not run` only with a reason.

- [ ] `pnpm verify` — 
- [ ] Targeted package/test command — 
- [ ] `pnpm content:validate` / `pnpm content:verify` if content changed — 
- [ ] `pnpm e2e` or browser/manual evidence if UI changed — 
- [ ] Replay/golden fixture check if engine state, events, saves, or content fingerprint changed — 

## Evidence

Attach or link any relevant artifacts.

- Screenshots / trace / video:
- Replay/save artifact:
- Content validation or pipeline bundle:

## Architecture boundaries

Confirm applicable boundaries.

- [ ] No runtime/live LLM call was added.
- [ ] No provider SDK was imported into shipped packages.
- [ ] `engine-core` remains DOM/node/vendor-free.
- [ ] `World` is still changed only through events folded by `applyEvent`.
- [ ] Generated content is loaded through the same content-loader path as hand-authored content.
- [ ] Public API changes are reflected in package `index.ts` and package README files.

## Follow-ups

- 
