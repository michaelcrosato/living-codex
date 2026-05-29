import type { Registries } from "@codex/content-loader";
import type { World } from "@codex/engine-core";
import { beatsLine } from "./beats";

/** Render a minimal text HUD (location + journal + beat progress) from World (T-12/T-15). */
export function renderHud(el: HTMLElement, world: World, registries: Registries): void {
  const lines: string[] = [];
  lines.push(`◍ ${registries.locations.get(world.locationId)?.name ?? world.locationId}`);
  lines.push(beatsLine(world));
  for (const [questId, quest] of registries.quests) {
    const rt = world.quests[questId];
    if (!rt || rt.status === "unoffered") continue;
    const branch = rt.completedBranchId ? ` (${rt.completedBranchId})` : "";
    lines.push(`✦ ${quest.title}: ${rt.status}${branch}`);
  }
  const flag = (key: string): boolean =>
    Object.entries(world.flags).some(([k, v]) => k === key && v === true);
  if (flag("flag.has_drive")) lines.push("✓ You have the drive.");
  if (flag("flag.entered_peacefully")) lines.push("· You talked your way in.");
  if (flag("flag.entered_unseen")) lines.push("· You were never seen.");
  if (flag("flag.syndicate_marked")) lines.push("⚠ The Syndicate has marked you.");
  el.textContent = lines.join("\n");
}
