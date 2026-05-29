import { loadPacks } from "@codex/content-loader";
import { FlagId, LocationId } from "@codex/content-schema";
import { accumulate, makeSave } from "@codex/engine-core";
import { createPixiRenderer } from "@codex/render-pixi";
import { InkNarrative } from "@codex/narrative-ink";
import { exportSave, saveGame } from "@codex/persistence";
import openingPack from "../../../content/core/pack.opening/pack.json";
import { GameSession } from "./session";
import { drawScene } from "./scene";
import { InputController } from "./input";
import { renderHud } from "./hud";

/**
 * The composition root (T-12): the ONLY place that wires loader + engine + render-pixi +
 * narrative-ink + persistence. A fixed-timestep loop (engine clock) collects input each frame
 * and steps GameSession; the app then reads World and draws. Movement: WASD/arrows. Interact: E.
 * Attack: F. Use exit / dialogue choice: number keys.
 */
async function main(): Promise<void> {
  const { registries, fingerprint } = loadPacks([openingPack]);
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

  let accumulatorMs = 0;
  let last = performance.now();
  const frame = (now: number): void => {
    const step = accumulate(accumulatorMs, now - last);
    accumulatorMs = step.accumulatorMs;
    last = now;
    for (let i = 0; i < step.steps; i++) session.step(input.drain());
    drawScene(renderer, session.world, registries, viewport);
    renderHud(hud, session.world, registries);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Debug/automation handle (used by the E4 browser smoke test).
  Object.assign(window, {
    __codex: {
      world: () => session.world,
      log: () => session.log,
      save: async (): Promise<string> => {
        const save = makeSave(session.world, [], fingerprint);
        await saveGame("auto", save);
        return exportSave(save);
      },
    },
  });
}

void main();
