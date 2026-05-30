import { z } from "zod";

/**
 * The player's skills (WORLD_STATE: `World.player.skills`). Declared here in the content treaty so
 * it is the SINGLE SOURCE OF TRUTH shared by both sides: the schema (`modify_skill` effect §5,
 * `skill_at_least` condition §7) and the engine (engine-core's `SkillId` derives from this). A
 * skillcheck *rolls* a skill; `skill_at_least` *gates* content on a skill threshold (a passive
 * check — content is visible/eligible only when the skill is high enough). Adding a skill is one
 * edit here; engine-core's `SKILLS` array is asserted identical to `SkillName.options` in a test.
 */
export const SkillName = z.enum(["persuade", "sneak", "force", "tech"]);
export type SkillName = z.infer<typeof SkillName>;
