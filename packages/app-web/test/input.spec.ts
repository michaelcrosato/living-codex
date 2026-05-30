import { describe, it, expect } from "vitest";
import { DialogueId } from "@codex/content-schema";
import type { InputEvent } from "@codex/engine-core";
import { InputController } from "../src/input";

/**
 * SPEC-99 — unit-cover InputController's key→InputEvent mapping (previously only e2e-smoke-tested with
 * Space + 'd'). Pins: WASD/arrows → Move; E → Interact; F → Attack; and the conditional number-key behavior
 * (dialogue choice when a dialogue is open, exit selector otherwise) — the branch most likely to regress.
 */
type Handlers = Record<string, (e: { key: string }) => void>;
function makeInput(): {
  input: InputController;
  press: (key: string) => void;
  release: (key: string) => void;
} {
  const handlers: Handlers = {};
  const target = {
    addEventListener: (type: string, fn: (e: { key: string }) => void) => (handlers[type] = fn),
  };
  const input = new InputController();
  input.attach(target as unknown as Window);
  return {
    input,
    press: (key) => handlers.keydown!({ key }),
    release: (key) => handlers.keyup!({ key }),
  };
}
const types = (evs: InputEvent[]): string[] => evs.map((e) => e.type);

describe("InputController key mapping (SPEC-99)", () => {
  it("E → Interact, F → Attack (discrete, queued once)", () => {
    const { input, press } = makeInput();
    press("e");
    press("f");
    expect(types(input.drain())).toEqual(["Interact", "Attack"]);
    expect(input.drain()).toEqual([]); // queue cleared after drain
  });

  it("held movement keys become one Move per frame; release stops it", () => {
    const { input, press, release } = makeInput();
    press("d");
    const moved = input.drain();
    expect(moved).toEqual([{ type: "Move", dir: { x: 1, y: 0 } }]);
    press("w"); // now diagonal up-right
    expect(input.drain()).toEqual([{ type: "Move", dir: { x: 1, y: -1 } }]);
    release("d");
    release("w");
    expect(input.drain()).toEqual([]); // nothing held → no Move
  });

  it("number keys are EXIT selectors with no dialogue open", () => {
    const { input, press } = makeInput();
    press("2");
    expect(input.drain()).toEqual([{ type: "UseExit", exitIndex: 1 }]);
  });

  it("number keys are dialogue CHOICES when a dialogue is open", () => {
    const { input, press } = makeInput();
    const dlg = DialogueId.parse("dialogue.varga_intro");
    input.openDialogue(dlg);
    press("3");
    expect(input.drain()).toEqual([{ type: "Choose", dialogueId: dlg, choiceIndex: 2 }]);
    input.closeDialogue();
    press("3");
    expect(input.drain()).toEqual([{ type: "UseExit", exitIndex: 2 }]); // reverts to exit after close
  });

  it("choose() is a no-op with no dialogue open", () => {
    const { input } = makeInput();
    input.choose(0);
    expect(input.drain()).toEqual([]);
  });
});
