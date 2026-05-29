// content-schema — the content treaty (SCHEMA.md). The single seam between the AI-coded
// engine (Pipeline A) and the AI-authored world (Pipeline B). Define once; used on both
// sides (runtime Zod validation + JSON Schema export for the offline pipeline).

export * from "./ids";
export * from "./condition";
export * from "./assertion";
export * from "./effect";
export * from "./faction";
export * from "./item";
export * from "./location";
export * from "./npc";
export * from "./quest";
export * from "./storylet";
export * from "./pack";
export * from "./fingerprint";
export { toJsonSchema } from "./json-schema";
