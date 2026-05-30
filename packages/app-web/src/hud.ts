import type { Registries } from "@codex/content-loader";
import type { World } from "@codex/engine-core";
import { beatsLine } from "./beats";

/**
 * Render a minimal text HUD (location + journal + beat progress) from World (T-12/T-15).
 * `bark` is the latest salient ambient storylet line (SPEC-24) — transient view state captured
 * from the TriggerStorylet event stream, not World (ShowText is a replay-exact no-op on World).
 */
/**
 * Screen-reader announcement for a location change (SPEC-81 a11y). The HUD div re-renders every frame, so
 * it can't be a live region (it would spam). Instead the shell tracks the last-announced location and feeds
 * a polite aria-live region only when it changes. Pure: returns the announcement, or null if unchanged.
 */
export function locationAnnouncement(
  previousLocationId: string | undefined,
  world: World,
  registries: Registries,
): string | null {
  if (world.locationId === previousLocationId) return null;
  const name = registries.locations.get(world.locationId)?.name ?? world.locationId;
  return `Entered ${name}.`;
}

export function renderHud(
  el: HTMLElement,
  world: World,
  registries: Registries,
  bark?: string,
): void {
  const lines: string[] = [];
  const location = registries.locations.get(world.locationId);
  lines.push(`◍ ${location?.name ?? world.locationId}`);
  // Authored location atmosphere (SPEC-71): surface ambientText, rotating slowly + deterministically by
  // tick so it doesn't flicker per-frame (one line per ~10s at 60fps; tick 0 → ambientText[0]).
  const ambient = location?.ambientText ?? [];
  if (ambient.length > 0) lines.push(`~ ${ambient[Math.floor(world.tick / 600) % ambient.length]}`);
  lines.push(beatsLine(world));
  if (bark) lines.push(`» ${bark}`);
  // The player's skill sheet (SPEC-76): branch choices gate on skill_check vs these, so show them.
  const skillLine = Object.entries(world.player.skills)
    .map(([name, value]) => `${name} ${value}`)
    .join(" · ");
  if (skillLine) lines.push(`⚔ ${skillLine}`);
  for (const [questId, quest] of registries.quests) {
    const rt = world.quests[questId];
    if (!rt || rt.status === "unoffered") continue;
    const branch = rt.completedBranchId ? ` (${rt.completedBranchId})` : "";
    lines.push(`✦ ${quest.title}: ${rt.status}${branch}`);
    // Surface the authored quest summary while it's active so the player knows what it's about (SPEC-75).
    if (rt.status === "active" && quest.summary) lines.push(`   ${quest.summary}`);
  }
  const flag = (key: string): boolean =>
    Object.entries(world.flags).some(([k, v]) => k === key && v === true);
  if (flag("flag.has_drive")) lines.push("✓ You have the drive.");
  if (flag("flag.entered_peacefully")) lines.push("· You talked your way in.");
  if (flag("flag.entered_unseen")) lines.push("· You were never seen.");
  if (flag("flag.syndicate_marked")) lines.push("⚠ The Syndicate has marked you.");
  // The drive's fate + the loyalty choice (SPEC-50/52/54/55) — the world remembers; so does the journal.
  if (flag("flag.sold_drive")) lines.push("✗ You sold the drive to the Syndicate.");
  if (flag("flag.knows_syndicate_secret")) lines.push("✓ You know what's on the drive.");
  if (flag("flag.leveraged_syndicate")) lines.push("⚠ You're holding the drive over the Syndicate.");
  if (flag("flag.sided_with_kestrel")) lines.push("· You threw in with Kestrel.");
  if (flag("flag.refused_kestrel")) lines.push("· You stayed loyal to Varga.");
  el.textContent = lines.join("\n");
}
