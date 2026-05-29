// OFFLINE content pipeline (Pipeline B, CONTENT_PIPELINE.md). Never shipped to the browser;
// dependency-cruiser forbids any package under packages/ from importing this tree.

export * from "./llm/adapter";
export { StubProvider, stubByRole } from "./llm/stub";
export { OpenRouterProvider, type OpenRouterOptions } from "./llm/openrouter";
export { Brief, makeBrief } from "./brief";
export * from "./schemas/proposals";
export { buildCanonIndex, renderCanon, type CanonEntity, type CanonIndex } from "./canon";
export { ROLE_SYSTEM_PROMPTS, buildUserPrompt, EXAMPLE_BRIEF, type Role } from "./prompts";
export { synthesize, type SynthesisInput } from "./synthesis";
export { runCycle, type CurationBundle, type RunCycleArgs } from "./pipelines/cycle";
export { renderBundleMarkdown, renderBundleHtml } from "./bundle";
export { scaffoldPack, type ScaffoldOptions } from "./scaffold";
export { finalizeProvenance, type CurationStamp } from "./bake";
export { DEMO_RESPONSES, demoProvider } from "./demo-fixture";
export { DRIP_RESPONSES, dripPatronsProvider } from "./drip-patrons-fixture";
