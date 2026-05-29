// content-loader — validates + indexes content packs into frozen registries, proving
// referential integrity at load time (ARCHITECTURE.md §4, SCHEMA.md §8). engine-core is
// handed the result; it never loads content itself.

export { loadPacks, orderByDependencies } from "./load";
export { validatePack } from "./validate";
export { checkIntegrity, type IntegrityError, type RefType } from "./integrity";
export { buildRegistries, fingerprintRegistries, type Registries, type LoadResult } from "./registries";
export { hashValue, stableStringify, hashString } from "./hash";
