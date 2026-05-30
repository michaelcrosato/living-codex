// content-loader — validates + indexes content packs into frozen registries, proving
// referential integrity at load time (ARCHITECTURE.md §4, SCHEMA.md §8). engine-core is
// handed the result; it never loads content itself.

export { loadPacks, orderByDependencies } from "./load";
export { validatePack } from "./validate";
export { checkIntegrity, type IntegrityError, type RefType } from "./integrity";
export { unsatisfiablePreconditions } from "./storylet-check";
export {
  buildRegistries,
  fingerprintRegistries,
  type Registries,
  type LoadResult,
} from "./registries";
export {
  buildCanonGraph,
  findCanonContradictions,
  findDanglingAssertionRefs,
  auditCanon,
  serializeAssertion,
  renderAssertionRecord,
  relevantSubgraph,
  type CanonGraph,
  type AssertionRecord,
  type CanonContradiction,
  type CanonRule,
} from "./canon-graph";
export { hashValue, stableStringify, hashString } from "./hash";
