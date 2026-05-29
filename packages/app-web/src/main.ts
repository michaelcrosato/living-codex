import { loadPacks } from "@codex/content-loader";
import { FlagId, LocationId } from "@codex/content-schema";
import { accumulate, makeSave } from "@codex/engine-core";
import { createPixiRenderer } from "@codex/render-pixi";
import { InkNarrative } from "@codex/narrative-ink";
import { exportSave, saveGame, requestPersistentStorage } from "@codex/persistence";
import openingPack from "../../../content/core/pack.opening/pack.json";
import dripPatrons from "../../../content/generated/pack.the_drip_patrons/pack.json";
import { GameSession } from "./session";
import { drawScene } from "./scene";
import { InputController } from "./input";
import { renderHud } from "./hud";
import { DialogueController } from "./dialogue-controller";
import { beats } from "./beats";

/**
 * The composition root (T-12): the ONLY place that wires loader + engine + render-pixi +
 * narrative-ink + persistence. A fixed-timestep loop (engine clock) collects input each frame
 * and steps GameSession; the app then reads World and draws. Movement: WASD/arrows. Interact: E.
 * Attack: F. Use exit / dialogue choice: number keys.
 */
/** A transient, screen-reader-announced status message (creates its own DOM; no markup needed). */
function toast(message: string): void {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

async function main(): Promise<void> {
  const { registries, fingerprint } = loadPacks([openingPack, dripPatrons]);
  // Best-effort: keep saves from being evicted under storage pressure (no-op if unsupported).
  void requestPersistentStorage();
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const hud = document.getElementById("hud") as HTMLElement;
  const viewport = { w: canvas.width, h: canvas.height };
  const { renderer } = await createPixiRenderer({ canvas, width: viewport.w, height: viewport.h });

  const session = new GameSession(registries, fingerprint, new InkNarrative(), {
    seed: "first-light",
    startLocationId: LocationId.parse("location.ashfall_district"),
    startPos: { x: 400, y: 300 },
    skills: { persuade: 3, sneak: 3, force: 4 },
    seedEvents: [{ type: "SetFlag", flag: FlagId.parse("flag.met_varga"), to: true }],
  });

  const input = new InputController();
  input.attach(window);
  const dialogue = new DialogueController(registries, new InkNarrative());
  const dialogueEl = document.getElementById("dialogue") as HTMLElement;

  // cold open (VERTICAL_SLICE §2 0:00): dismiss on first input
  const coldOpenEl = document.getElementById("cold-open") as HTMLElement;
  const dismissColdOpen = (): void => {
    coldOpenEl.style.display = "none";
  };
  coldOpenEl.addEventListener("click", dismissColdOpen);

  // app-only UI state: which NPC's dialogue is open (by def id), if any
  let openNpcId: string | null = null;
  const closeDialogue = (): void => {
    openNpcId = null;
    input.closeDialogue();
    dialogueEl.style.display = "none";
  };

  let accumulatorMs = 0;
  let last = performance.now();
  const frame = (now: number): void => {
    const step = accumulate(accumulatorMs, now - last);
    accumulatorMs = step.accumulatorMs;
    last = now;
    for (let i = 0; i < step.steps; i++) {
      const events = session.step(input.drain());
      // open a dialogue panel when the interaction system reports a talk
      for (const ev of events) {
        if (ev.type === "Interacted") {
          const entity = session.world.entities[ev.entityId];
          if (entity) openNpcId = entity.defId;
        }
      }
    }

    drawScene(renderer, session.world, registries, viewport);
    renderHud(hud, session.world, registries);

    // render / refresh the dialogue panel from current world state
    if (openNpcId) {
      const open = dialogue.openFor(session.world, openNpcId);
      if (!open || open.frame.choices.length === 0) {
        closeDialogue();
      } else {
        input.openDialogue(open.dialogueId);
        dialogueEl.style.display = "block";
        const choices = open.frame.choices.map((c) => `  [${c.index + 1}] ${c.text}`).join("\n");
        dialogueEl.textContent = `${open.npcName}\n\n${open.frame.text}\n\n${choices}\n\n(number keys to choose · Esc to leave)`;
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  window.addEventListener("keydown", (e) => {
    dismissColdOpen();
    const k = e.key.toLowerCase();
    if (e.key === "Escape") closeDialogue();
    else if (k === "k")
      saveGame("manual", makeSave(session.world, [], fingerprint)).then(
        () => toast("Saved."),
        (err: unknown) => toast(err instanceof Error ? err.message : "Save failed."),
      );
    else if (k === "l") {
      // export the current session as a downloadable JSON (replayable bug report / share)
      const json = exportSave(makeSave(session.world, [], fingerprint));
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "living-codex-save.json";
      a.click();
      URL.revokeObjectURL(url);
    }
  });

  // Debug/automation handle (used by the E4 browser smoke test).
  Object.assign(window, {
    __codex: {
      world: () => session.world,
      log: () => session.log,
      beats: () => beats(session.world),
      save: async (): Promise<string> => {
        const save = makeSave(session.world, [], fingerprint);
        await saveGame("auto", save);
        return exportSave(save);
      },
    },
  });
}

void main();
