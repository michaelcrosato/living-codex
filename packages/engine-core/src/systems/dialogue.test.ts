import { describe, it, expect } from "vitest";
import {
  DialogueAsset,
  DialogueId,
  FlagId,
  LocationId,
  type ContentFingerprint,
} from "@codex/content-schema";
import { createWorld } from "../state/world";
import { applyEvents } from "../events/apply";
import { hash } from "../state/snapshot";
import { createLog, appendEvent, replay } from "../events/log";
import type { Narrative, StorySession, StoryFrame } from "../ports/narrative";
import { dialogueSystem } from "./dialogue";

const START = LocationId.parse("location.start");
const DLG = DialogueId.parse("dialogue.varga_intro");
const FP: ContentFingerprint = { packs: {}, registriesHash: "x" };

/** A deterministic stub narrative — proves the system/event/replay path with no inkjs. */
class StubSession implements StorySession {
  private vars: Record<string, string | number | boolean> = { accepted: false };
  current(): StoryFrame {
    return {
      text: "Lost. Or hunted.",
      tags: [],
      choices: [
        { index: 0, text: "I'll do it" },
        { index: 1, text: "No" },
      ],
    };
  }
  choose(i: number): void {
    if (i === 0) this.vars.accepted = true;
  }
  getVar(name: string): string | number | boolean {
    return this.vars[name] ?? false;
  }
  setVar(name: string, value: string | number | boolean): void {
    this.vars[name] = value;
  }
  save(): string {
    return JSON.stringify(this.vars);
  }
  load(serialized: string): void {
    this.vars = JSON.parse(serialized) as Record<string, string | number | boolean>;
  }
}
const narrative: Narrative = { load: () => new StubSession() };

const asset = DialogueAsset.parse({
  id: "dialogue.varga_intro",
  format: "ink-json",
  inkVersion: "21",
  sourceHash: "x",
  compiled: {},
  declaredVars: ["accepted"],
});
const dialogues = new Map([[DLG, asset]]);

describe("dialogue system (T-07)", () => {
  it("emits DialogueAdvanced capturing Ink state and mirrors declaredVars into flags", () => {
    const world = createWorld({ seed: "s", startLocationId: START });
    const sys = dialogueSystem([{ type: "Choose", dialogueId: DLG, choiceIndex: 0 }], {
      narrative,
      dialogues,
    });
    const events = sys(world, 0);
    expect(events).toHaveLength(1);
    const next = applyEvents(world, events);
    expect(next.dialogue[DLG]).toBe(JSON.stringify({ accepted: true }));
    expect(next.flags[FlagId.parse("flag.accepted")]).toBe(true);
  });

  it("ignores an out-of-range choice index", () => {
    const world = createWorld({ seed: "s", startLocationId: START });
    const sys = dialogueSystem([{ type: "Choose", dialogueId: DLG, choiceIndex: 9 }], {
      narrative,
      dialogues,
    });
    expect(sys(world, 0)).toHaveLength(0);
  });

  it("replays from the captured snapshot to an identical world hash (no Ink re-run)", () => {
    const world = createWorld({ seed: "s", startLocationId: START });
    const events = dialogueSystem([{ type: "Choose", dialogueId: DLG, choiceIndex: 0 }], {
      narrative,
      dialogues,
    })(world, 0);
    const live = applyEvents(world, events);

    const log = createLog("s", FP);
    events.forEach((e, i) => appendEvent(log, i, e));
    const replayed = replay(createWorld({ seed: "s", startLocationId: START }), log);
    expect(hash(replayed)).toBe(hash(live));
  });
});
