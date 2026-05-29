import type { Registries } from "@codex/content-loader";
import type { World } from "@codex/engine-core";

/** Render a minimal text HUD (location + journal) from World — the app reading state (T-12). */
export function renderHud(el: HTMLElement, world: World, registries: Registries): void {
  const lines: string[] = [];
  lines.push(`◍ ${registries.locations.get(world.locationId)?.name ?? world.locationId}`);
  for (const [questId, quest] of registries.quests) {
    const rt = world.quests[questId];
    if (!rt || rt.status === "unoffered") continue;
    const branch = rt.completedBranchId ? ` (${rt.completedBranchId})` : "";
    lines.push(`✦ ${quest.title}: ${rt.status}${branch}`);
  }
  if (Object.entries(world.flags).some(([k, v]) => k === "flag.has_drive" && v === true)) {
    lines.push("✓ You have the drive.");
  }
  el.textContent = lines.join("\n");
}
