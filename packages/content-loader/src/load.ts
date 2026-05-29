import type { ContentPack } from "@codex/content-schema";
import { validatePack } from "./validate";
import { checkIntegrity } from "./integrity";
import { buildRegistries, fingerprintRegistries, type LoadResult } from "./registries";

/** Topologically order packs by `dependsOn`; fail on a missing dependency or a cycle. */
export function orderByDependencies(packs: ContentPack[]): ContentPack[] {
  const byId = new Map<string, ContentPack>();
  for (const pack of packs) {
    if (byId.has(pack.id)) throw new Error(`Duplicate pack id "${pack.id}".`);
    byId.set(pack.id, pack);
  }
  for (const pack of packs) {
    for (const dep of pack.dependsOn) {
      if (!byId.has(dep)) {
        throw new Error(`Pack "${pack.id}" depends on "${dep}", which was not provided.`);
      }
    }
  }

  const ordered: ContentPack[] = [];
  const state = new Map<string, "visiting" | "done">();
  const visit = (pack: ContentPack): void => {
    const status = state.get(pack.id);
    if (status === "done") return;
    if (status === "visiting") {
      throw new Error(`Dependency cycle detected involving pack "${pack.id}".`);
    }
    state.set(pack.id, "visiting");
    for (const dep of pack.dependsOn) visit(byId.get(dep)!);
    state.set(pack.id, "done");
    ordered.push(pack);
  };
  for (const pack of packs) visit(pack);
  return ordered;
}

/**
 * The public entry point (T-03): validate every raw pack, order by dependency, prove
 * referential integrity, and produce frozen registries + a content fingerprint. Any failure
 * is loud and precise, at load time — never at play time.
 */
export function loadPacks(rawPacks: unknown[]): LoadResult {
  const validated = rawPacks.map((raw, i) => validatePack(raw, `#${i}`));
  const ordered = orderByDependencies(validated);

  const errors = checkIntegrity(ordered);
  if (errors.length > 0) {
    const detail = errors
      .map((e) => `  - [${e.pack}] ${e.where} -> missing ${e.type} "${e.id}"`)
      .join("\n");
    throw new Error(
      `Referential integrity failed (${errors.length} dangling reference(s)):\n${detail}`,
    );
  }

  const registries = buildRegistries(ordered);
  const fingerprint = fingerprintRegistries(ordered, registries);
  return { registries, fingerprint };
}
