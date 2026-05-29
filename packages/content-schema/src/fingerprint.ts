/**
 * Identifies exactly which content a replay log / save was recorded against
 * (WORLD_STATE.md §7). The loader produces it; the replay system compares it so a log
 * recorded against older content refuses or warns rather than silently mis-replaying.
 * Lives in the treaty because it is about *content identity*, shared by both pipelines.
 */
export interface ContentFingerprint {
  /** pack id -> semver, for every loaded pack. */
  packs: Record<string, string>;
  /** Stable hash of the fully resolved, loaded registries. */
  registriesHash: string;
}
