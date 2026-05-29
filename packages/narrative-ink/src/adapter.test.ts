import { describe, it, expect } from "vitest";
import {
  DialogueAsset,
  DialogueId,
  FlagId,
  LocationId,
  type ContentFingerprint,
} from "@codex/content-schema";
import {
  createWorld,
  applyEvents,
  hash,
  createLog,
  appendEvent,
  replay,
  dialogueSystem,
} from "@codex/engine-core";
import { InkNarrative, compileInk } from "./adapter";

const START = LocationId.parse("location.start");
const DLG = DialogueId.parse("dialogue.varga_intro");
const FP: ContentFingerprint = { packs: {}, registriesHash: "x" };

// A dialogue whose outcome includes Ink's own RANDOM() — the determinism crux of T-07.
const SRC = [
  "VAR accepted = false",
  "VAR roll = 0",
  "You hesitate at the door.",
  "+ [Take the job]",
  "~ accepted = true",
  "~ roll = RANDOM(1, 1000000)",
  "-> END",
  "+ [Walk away]",
  "-> END",
].join("\n");

const compiled = compileInk(SRC);
const asset = DialogueAsset.parse({
  id: "dialogue.varga_intro",
  format: "ink-json",
  inkVersion: "21",
  sourceHash: "x",
  compiled,
  declaredVars: ["accepted", "roll"],
});
const dialogues = new Map([[DLG, asset]]);
const narrative = new InkNarrative();

describe("InkNarrative adapter", () => {
  it("loads, presents choices, advances, and mirrors a chosen var", () => {
    const session = narrative.load(compiled);
    const frame = session.current();
    expect(frame.choices.map((c) => c.text)).toEqual(["Take the job", "Walk away"]);
    session.choose(0);
    session.current();
    expect(session.getVar("accepted")).toBe(true);
  });

  it("save()/load() restores full Ink state verbatim (incl. the RANDOM result)", () => {
    const a = narrative.load(compiled);
    a.current();
    a.choose(0);
    a.current();
    const rolled = a.getVar("roll");
    const snapshot = a.save();

    const b = narrative.load(compiled);
    b.load(snapshot);
    expect(b.getVar("roll")).toBe(rolled); // restored, not recomputed
  });
});

describe("T-07 determinism reconciliation: dialogue with RANDOM replays exactly", () => {
  it("hash(replay(log)) === hash(live) even though the choice ran Ink RANDOM()", () => {
    const world = createWorld({ seed: "ashfall", startLocationId: START });
    const events = dialogueSystem([{ type: "Choose", dialogueId: DLG, choiceIndex: 0 }], {
      narrative,
      dialogues,
    })(world, 0);
    const live = applyEvents(world, events);

    // the RANDOM result was captured into the event/world, not left to chance
    expect(live.flags[FlagId.parse("flag.accepted")]).toBe(true);
    expect(typeof live.flags[FlagId.parse("flag.roll")]).toBe("number");

    const log = createLog("ashfall", FP);
    events.forEach((e, i) => appendEvent(log, i, e));

    // replay folds the CAPTURED DialogueAdvanced — it never re-runs Ink
    const replayed = replay(createWorld({ seed: "ashfall", startLocationId: START }), log);
    expect(hash(replayed)).toBe(hash(live));
  });
});
