import type { Registries } from "@codex/content-loader";
import type { World } from "@codex/engine-core";
import { beatsLine } from "./beats";

/**
 * Render a minimal text HUD (location + journal + beat progress) from World (T-12/T-15).
 * `bark` is the latest salient ambient storylet line (SPEC-24) — transient view state captured
 * from the TriggerStorylet event stream, not World (ShowText is a replay-exact no-op on World).
 */
/**
 * The "world remembers" consequence journal (SPEC-50/52/54/55/56), as data so the HUD and the screen-reader
 * announcer (SPEC-83) share one curated list: flag → an icon for the HUD line + the spoken text.
 */
const CONSEQUENCE_LINES: ReadonlyArray<{ flag: string; icon: string; text: string }> = [
  { flag: "flag.has_drive", icon: "✓", text: "You have the drive." },
  { flag: "flag.entered_peacefully", icon: "·", text: "You talked your way in." },
  { flag: "flag.entered_unseen", icon: "·", text: "You were never seen." },
  { flag: "flag.syndicate_marked", icon: "⚠", text: "The Syndicate has marked you." },
  { flag: "flag.sold_drive", icon: "✗", text: "You sold the drive to the Syndicate." },
  { flag: "flag.knows_syndicate_secret", icon: "✓", text: "You know what's on the drive." },
  {
    flag: "flag.leveraged_syndicate",
    icon: "⚠",
    text: "You're holding the drive over the Syndicate.",
  },
  { flag: "flag.sided_with_kestrel", icon: "·", text: "You threw in with Kestrel." },
  { flag: "flag.refused_kestrel", icon: "·", text: "You stayed loyal to Varga." },
  { flag: "flag.played_both", icon: "·", text: "You played Kestrel and Varga against each other." },
  // The other threads' headline outcomes (SPEC-91), so the journal covers the whole slice, not just the drive.
  { flag: "flag.learned_origin", icon: "✓", text: "You know who you were before Ashfall." },
  { flag: "flag.clinic_debt_resolved", icon: "·", text: "You settled the clinic's debt." },
  { flag: "flag.told_the_kid", icon: "·", text: "You told the kid the truth about her brother." },
];

const flagIsTrue = (world: World, key: string): boolean =>
  Object.entries(world.flags).some(([k, v]) => k === key && v === true);

/**
 * Screen-reader announcements for newly-set consequence flags (SPEC-83, extends SPEC-81/82). Returns the
 * spoken text for each CONSEQUENCE_LINES flag that became true since `previous` + the new seen-set, deduped.
 */
export function consequenceAnnouncements(
  previous: ReadonlySet<string>,
  world: World,
): { lines: string[]; seen: Set<string> } {
  const seen = new Set(previous);
  const lines: string[] = [];
  for (const { flag, text } of CONSEQUENCE_LINES) {
    if (flagIsTrue(world, flag) && !seen.has(flag)) {
      seen.add(flag);
      lines.push(text);
    }
  }
  return { lines, seen };
}

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

/**
 * Screen-reader announcements for quest-status changes (SPEC-82, extends SPEC-81). Returns one line per quest
 * whose status changed since `previous` ("Quest started/completed: …") plus the new status map for the shell
 * to hold — deduped, so each transition is spoken once, not per frame. Pure + unit-testable.
 */
export function questAnnouncements(
  previous: Readonly<Record<string, string>>,
  world: World,
  registries: Registries,
): { lines: string[]; statuses: Record<string, string> } {
  const lines: string[] = [];
  const statuses: Record<string, string> = {};
  for (const [questId, rt] of Object.entries(world.quests)) {
    statuses[questId] = rt.status;
    if (previous[questId] === rt.status) continue;
    const title = registries.quests.get(questId as never)?.title ?? questId;
    if (rt.status === "active") lines.push(`Quest started: ${title}.`);
    else if (rt.status === "completed") lines.push(`Quest completed: ${title}.`);
  }
  return { lines, statuses };
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
  // The "world remembers" consequence journal — one curated list (CONSEQUENCE_LINES), shared with the a11y announcer.
  for (const { flag, icon, text } of CONSEQUENCE_LINES) {
    if (flagIsTrue(world, flag)) lines.push(`${icon} ${text}`);
  }
  el.textContent = lines.join("\n");
}
