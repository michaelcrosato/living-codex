// OFFLINE content pipeline (Pipeline B, CONTENT_PIPELINE.md). Never shipped to the browser;
// dependency-cruiser forbids any package under packages/ from importing this tree.

export * from "./llm/adapter";
export { StubProvider, stubByRole } from "./llm/stub";
export { OpenRouterProvider, type OpenRouterOptions } from "./llm/openrouter";
export { Brief, makeBrief } from "./brief";
export { ArcSkeleton, Scorecard } from "./schemas/proposals";
export { buildCanonIndex, renderCanon, type CanonEntity, type CanonIndex } from "./canon";
export { ROLE_SYSTEM_PROMPTS, buildUserPrompt, EXAMPLE_BRIEF, type Role } from "./prompts";
export { runCycle, type CycleResult, type RunCycleArgs } from "./pipelines/cycle";
