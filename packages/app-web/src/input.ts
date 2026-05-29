import type { DialogueId } from "@codex/content-schema";
import type { InputEvent } from "@codex/engine-core";

/**
 * Maps raw keyboard input to engine InputEvents (T-12). Held movement keys become a Move each
 * frame; discrete presses queue once. Number keys are dialogue choices when a dialogue is open,
 * otherwise exit selectors. The shell drains this once per fixed step and feeds GameSession.step.
 */
const MOVE_KEYS = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]);

export class InputController {
  private readonly held = new Set<string>();
  private readonly queued: InputEvent[] = [];
  private dialogueId: DialogueId | null = null;

  attach(target: Window): void {
    target.addEventListener("keydown", (e) => this.onKey(e.key, true));
    target.addEventListener("keyup", (e) => this.onKey(e.key, false));
  }

  openDialogue(id: DialogueId): void {
    this.dialogueId = id;
  }
  closeDialogue(): void {
    this.dialogueId = null;
  }
  /** Queue a dialogue choice (from a clicked/keyboard-activated choice button). No-op if none open. */
  choose(choiceIndex: number): void {
    if (this.dialogueId !== null) {
      this.queued.push({ type: "Choose", dialogueId: this.dialogueId, choiceIndex });
    }
  }
  isDialogueOpen(): boolean {
    return this.dialogueId !== null;
  }

  private onKey(key: string, down: boolean): void {
    const k = key.toLowerCase();
    if (MOVE_KEYS.has(k)) {
      if (down) this.held.add(k);
      else this.held.delete(k);
      return;
    }
    if (!down) return;
    if (k === "e") this.queued.push({ type: "Interact" });
    else if (k === "f") this.queued.push({ type: "Attack" });
    else if (/^[1-9]$/.test(k)) {
      const index = Number(k) - 1;
      this.queued.push(
        this.dialogueId
          ? { type: "Choose", dialogueId: this.dialogueId, choiceIndex: index }
          : { type: "UseExit", exitIndex: index },
      );
    }
  }

  drain(): InputEvent[] {
    const out: InputEvent[] = [];
    let dx = 0;
    let dy = 0;
    if (this.held.has("arrowleft") || this.held.has("a")) dx -= 1;
    if (this.held.has("arrowright") || this.held.has("d")) dx += 1;
    if (this.held.has("arrowup") || this.held.has("w")) dy -= 1;
    if (this.held.has("arrowdown") || this.held.has("s")) dy += 1;
    if (dx !== 0 || dy !== 0) out.push({ type: "Move", dir: { x: dx, y: dy } });
    out.push(...this.queued);
    this.queued.length = 0;
    return out;
  }
}
