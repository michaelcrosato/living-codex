import { StubProvider, stubByRole } from "./llm/stub";

/**
 * The canned "Drip patrons" ensemble for P3 (CONTENT_PIPELINE.md): 9 bar regulars + a hook NPC,
 * grounded in existing canon (factions/location). Stands in for a real multi-model proposal so
 * the bake is deterministic and offline. One patron (Teesh) carries the warehouse rumor; the
 * Archivist is the slice's closing hook ("I heard what happened at the warehouse…").
 */
interface PatronSeed {
  id: string;
  name: string;
  faction?: string;
  silhouette: "humanoid" | "tall" | "stocky" | "cloaked" | "mech" | "beast";
  role: string;
  backstory: string;
  wants: string;
  fears: string;
  voice: string;
  line: string;
  flag?: string;
}

const PATRONS: PatronSeed[] = [
  {
    id: "npc.drip_bartender",
    name: "Mox",
    silhouette: "stocky",
    role: "the Drip's bartender",
    backstory: "Poured drinks through three regime changes. Remembers every tab.",
    wants: "to close out the night without a body on the floor",
    fears: "the Syndicate calling in her brother's debt",
    voice: "dry, unhurried, sees everything",
    line: 'Mox slides a glass over. "First one\'s on the house. The next one\'s the truth."',
  },
  {
    id: "npc.drip_rumor",
    name: "Teesh",
    silhouette: "humanoid",
    role: "off-shift dockhand",
    backstory: "Loads crates she's told not to look inside. She looks anyway.",
    wants: "to sell what she knows before someone buys her silence",
    fears: "being the next crate",
    voice: "quick, low, glancing at the door",
    line: 'Teesh leans in. "Word is the Syndicate\'s sitting on a drive in the old warehouse. People are already dead over it."',
    flag: "heard_warehouse_rumor",
  },
  {
    id: "npc.drip_pell",
    name: "Old Pell",
    silhouette: "humanoid",
    role: "washed-up ex-enforcer",
    backstory: "Used to break legs for rent. Now his own barely hold him up.",
    wants: "one more good story and one more cheap drink",
    fears: "remembering the names",
    voice: "slurred, grandiose, suddenly sharp",
    line: 'Old Pell raises his glass. "To Ashfall! She\'ll drown us all and charge for the water."',
  },
  {
    id: "npc.drip_wren",
    name: "Wren",
    faction: "faction.varga_crew",
    silhouette: "tall",
    role: "Varga's courier",
    backstory: "Runs packages and messages for Varga; fast, loyal, underpaid.",
    wants: "to prove she's ready for the bigger jobs",
    fears: "letting Varga down",
    voice: "eager, clipped, proud",
    line: 'Wren sizes you up. "You\'re the one Varga\'s waiting on. Don\'t keep her."',
  },
  {
    id: "npc.drip_bex",
    name: "Bex",
    faction: "faction.ashfall_syndicate",
    silhouette: "stocky",
    role: "off-duty Syndicate muscle",
    backstory: "Collects for the Syndicate. Drinks here because nobody dares start anything.",
    wants: "a quiet pint and no questions",
    fears: "the auditors",
    voice: "flat, heavy, faintly bored",
    line: 'Bex doesn\'t look up. "Whatever you\'re selling, I\'m not buying. Move along."',
  },
  {
    id: "npc.drip_sull",
    name: "Doc Sull",
    silhouette: "cloaked",
    role: "back-room medic",
    backstory: "Lost the license, kept the hands. Stitches whoever pays, no names taken.",
    wants: "to keep the back room stocked and unofficial",
    fears: "a patient who can't be saved and won't be forgotten",
    voice: "gentle, tired, precise",
    line: 'Doc Sull nods at the door behind the bar. "Bleeding? Back room. Talking? I\'m off the clock."',
  },
  {
    id: "npc.drip_yi",
    name: "Lucky Yi",
    silhouette: "humanoid",
    role: "card sharp",
    backstory: "Never lost a hand he meant to win. Owes more than he'll admit.",
    wants: "the one big score that clears the board",
    fears: "his luck was never luck",
    voice: "smooth, teasing, always counting",
    line: 'Lucky Yi fans a deck. "Sit. One hand. I\'ll even let you think you\'re winning."',
  },
  {
    id: "npc.drip_halo",
    name: "Halo",
    silhouette: "humanoid",
    role: "synth musician",
    backstory: "Plays the corner most nights; hears more than the regulars think.",
    wants: "a crowd that listens for once",
    fears: "the silence after the set",
    voice: "soft, wry, half-singing",
    line: 'Halo bends a note. "Requests cost extra. Secrets cost more."',
  },
  {
    id: "npc.drip_grin",
    name: "Grin",
    faction: "faction.ashfall_syndicate",
    silhouette: "cloaked",
    role: "information broker",
    backstory: "Smiles at everyone, sells everyone. The smile never reaches the eyes.",
    wants: "to know one thing about you that you'd pay to keep quiet",
    fears: "owing more than he's owed",
    voice: "warm, oily, relentless",
    line: 'Grin spreads his hands. "Everything\'s for sale in here, friend. Even you. Especially you."',
  },
  {
    id: "npc.the_archivist",
    name: "The Archivist",
    silhouette: "cloaked",
    role: "keeper of dangerous truths",
    backstory: "Appears when something important has just happened. Nobody knows for whom they work.",
    wants: "the drive, and the one who took it",
    fears: "being too late, again",
    voice: "calm, deliberate, unsettlingly certain",
    line: 'A figure in a long coat settles across from you. "I heard what happened at the warehouse. The drive — you don\'t know what\'s on it, do you? Find me when you want the truth. About the drive. About you."',
    flag: "met_archivist",
  },
];

function ink(seed: PatronSeed): string {
  const head = seed.flag ? `VAR ${seed.flag} = false\n` : "";
  const set = seed.flag ? `~ ${seed.flag} = true\n` : "";
  return `${head}${seed.line}\n+ [Talk]\n${set}-> END\n+ [Leave]\n-> END`;
}

const NPCS = {
  npcs: PATRONS.map((p) => ({
    id: p.id,
    name: p.name,
    ...(p.faction ? { faction: p.faction } : {}),
    appearance: { bodyColor: "#3a3f4b", accentColor: "#2bd1ff", silhouette: p.silhouette },
    bio: {
      role: p.role,
      backstory: p.backstory,
      wants: p.wants,
      fears: p.fears,
      voice: p.voice,
      secrets: [],
    },
    ink: ink(p),
    declaredVars: p.flag ? [p.flag] : [],
  })),
};

const ARC = {
  title: "The Regulars of the Drip",
  premise: "A dozen lives orbit a dim bar in Ashfall; one carries a rumor, one carries a hook.",
  beats: ["Enter the Drip", "Read the room", "Catch the rumor", "Meet the one who was waiting"],
  branches: [{ label: "Work the room", approach: "other", stakes: "What you learn here changes what's possible later." }],
};

const REFERENCES = {
  npcs: [],
  factions: ["faction.varga_crew", "faction.ashfall_syndicate"],
  locations: ["location.ashfall_district"],
  items: [],
};

const SCORECARD = {
  canonConsistency: 9,
  choiceDensity: 6,
  emotionalStakes: 6,
  novelty: 7,
  integrationCost: 3,
  contradictions: [],
  notes: "Cast is coherent with Ashfall's tone; the rumor and hook wire cleanly to the slice.",
};

export const DRIP_RESPONSES: Record<string, string> = {
  "TASK:ARC": JSON.stringify(ARC),
  "TASK:REFERENCES": JSON.stringify(REFERENCES),
  "TASK:NPCS": JSON.stringify(NPCS),
  "TASK:SCORECARD": JSON.stringify(SCORECARD),
};

export function dripPatronsProvider(): StubProvider {
  return stubByRole(DRIP_RESPONSES);
}
