import { loadPacks } from "@codex/content-loader";
import { FlagId, LocationId } from "@codex/content-schema";
import { accumulate, makeSave } from "@codex/engine-core";
import { createPixiRenderer } from "@codex/render-pixi";
import { InkNarrative } from "@codex/narrative-ink";
import {
  exportSave,
  importSave,
  saveGame,
  loadGame,
  requestPersistentStorage,
} from "@codex/persistence";
import openingPack from "../../../content/core/pack.opening/pack.json";
import districtBarks from "../../../content/core/pack.district_barks/pack.json";
import dripMarket from "../../../content/core/pack.drip_market/pack.json";
import syndicateOffer from "../../../content/core/pack.syndicate_offer/pack.json";
import kestrel from "../../../content/core/pack.kestrel/pack.json";
import vargaTrust from "../../../content/core/pack.varga_trust/pack.json";
import clinic from "../../../content/core/pack.clinic/pack.json";
import lostThread from "../../../content/core/pack.lost_thread/pack.json";
import streetKid from "../../../content/core/pack.street_kid/pack.json";
import dripPatrons from "../../../content/generated/pack.the_drip_patrons/pack.json";
import { GameSession } from "./session";
import { drawScene } from "./scene";
import { InputController } from "./input";
import {
  renderHud,
  locationAnnouncement,
  questAnnouncements,
  consequenceAnnouncements,
} from "./hud";
import { DialogueController } from "./dialogue-controller";
import { DialogueView } from "./dialogue-view";
import { beats } from "./beats";
import { mark, measure, installErrorBoundary, getTelemetry } from "./telemetry";

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
  const { registries, fingerprint } = loadPacks([
    openingPack,
    districtBarks,
    dripMarket,
    syndicateOffer,
    kestrel,
    vargaTrust,
    clinic,
    lostThread,
    streetKid,
    dripPatrons,
  ]);
  // Best-effort: keep saves from being evicted under storage pressure (no-op if unsupported).
  void requestPersistentStorage();
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const hud = document.getElementById("hud") as HTMLElement;
  const announcer = document.getElementById("announcer") as HTMLElement;
  let announcedLocation: string | undefined; // SPEC-81: last location announced to screen readers
  let announcedQuests: Record<string, string> = {}; // SPEC-82: last-announced quest statuses
  let announcedConsequences = new Set<string>(); // SPEC-83: consequence flags already announced
  const viewport = { w: canvas.width, h: canvas.height };
  const { renderer } = await createPixiRenderer({ canvas, width: viewport.w, height: viewport.h });

  // `let` (not const): a load (SPEC-78) swaps in a restored session; the rAF loop reads the current binding.
  let session = new GameSession(registries, fingerprint, new InkNarrative(), {
    seed: "first-light",
    startLocationId: LocationId.parse("location.ashfall_district"),
    startPos: { x: 400, y: 300 },
    skills: { persuade: 3, sneak: 3, force: 4 },
    seedEvents: [{ type: "SetFlag", flag: FlagId.parse("flag.met_varga"), to: true }],
  });

  // Capture uncaught errors/rejections (tagged with the current tick) into the offline buffer.
  installErrorBoundary(() => session.world.tick);

  const input = new InputController();
  input.attach(window);
  const dialogue = new DialogueController(registries, new InkNarrative());
  const dialogueView = new DialogueView(
    document.getElementById("dialogue") as HTMLElement,
    (choiceIndex) => input.choose(choiceIndex),
  );

  // cold open (VERTICAL_SLICE §2 0:00): dismiss on first input
  const coldOpenEl = document.getElementById("cold-open") as HTMLElement;
  const dismissColdOpen = (): void => {
    coldOpenEl.style.display = "none";
  };
  coldOpenEl.addEventListener("click", dismissColdOpen);

  // Accessibility: user toggle for a more legible (dyslexia-friendly) font.
  const fontToggle = document.getElementById("font-toggle");
  fontToggle?.addEventListener("click", () => {
    const on = document.body.classList.toggle("dyslexia");
    fontToggle.setAttribute("aria-pressed", String(on));
  });

  // app-only UI state: which NPC's dialogue is open (by def id), if any
  let openNpcId: string | null = null;
  // app-only UI state: the latest salient ambient bark (SPEC-24). ShowText is a no-op on World
  // (replay-exact), so the bark is captured from the TriggerStorylet event stream, not from state.
  let lastBark: string | undefined;
  const closeDialogue = (): void => {
    openNpcId = null;
    input.closeDialogue();
    dialogueView.close();
  };

  // Swap in a restored session from a loaded/imported save (SPEC-78/79).
  const restoreFrom = (save: ReturnType<typeof importSave>): void => {
    closeDialogue();
    session = GameSession.restore(registries, fingerprint, new InkNarrative(), save);
  };

  // SPEC-79: import a previously-exported save file (the L-export's counterpart). A hidden file input
  // triggered by the 'i' key; on pick, parse via importSave and restore. (File-read is thin DOM glue;
  // importSave + GameSession.restore are unit-tested.)
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/json";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.value = ""; // allow re-importing the same file
    if (!file) return;
    file.text().then(
      (text) => {
        try {
          restoreFrom(importSave(text));
          toast("Imported.");
        } catch (err) {
          toast(err instanceof Error ? err.message : "Import failed.");
        }
      },
      () => toast("Import failed."),
    );
  });

  let accumulatorMs = 0;
  let last = performance.now();
  const frame = (now: number): void => {
    const step = accumulate(accumulatorMs, now - last);
    accumulatorMs = step.accumulatorMs;
    last = now;
    mark("codex:sim:start");
    for (let i = 0; i < step.steps; i++) {
      const events = session.step(input.drain());
      // open a dialogue panel when the interaction system reports a talk
      for (const ev of events) {
        if (ev.type === "Interacted") {
          const entity = session.world.entities[ev.entityId];
          if (entity) openNpcId = entity.defId;
        } else if (ev.type === "TriggerStorylet") {
          // Surface the salient ambient bark (highest-salience candidate) in the HUD.
          const bark = ev.candidates[0]?.content.ambient;
          if (bark) lastBark = bark;
        }
      }
    }
    measure("codex:sim", "codex:sim:start");

    mark("codex:draw:start");
    drawScene(renderer, session.world, registries, viewport);
    renderHud(hud, session.world, registries, lastBark);
    // a11y announcements (SPEC-81/82): location changes + quest-status changes, deduped (only on change).
    const announcements: string[] = [];
    const locAnn = locationAnnouncement(announcedLocation, session.world, registries);
    if (locAnn) {
      announcements.push(locAnn);
      announcedLocation = session.world.locationId;
    }
    const qa = questAnnouncements(announcedQuests, session.world, registries);
    announcedQuests = qa.statuses;
    announcements.push(...qa.lines);
    const ca = consequenceAnnouncements(announcedConsequences, session.world);
    announcedConsequences = ca.seen;
    announcements.push(...ca.lines);
    if (announcements.length > 0) announcer.textContent = announcements.join(" ");
    measure("codex:draw", "codex:draw:start");

    // render / refresh the accessible dialogue panel from current world state
    const open = openNpcId ? dialogue.openFor(session.world, openNpcId) : null;
    if (open && open.frame.choices.length > 0) {
      input.openDialogue(open.dialogueId);
      dialogueView.render(open);
    } else if (dialogueView.isOpen()) {
      closeDialogue();
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
    else if (k === "o")
      // Load (SPEC-78): restore the last manual save and swap in the reconstructed session.
      loadGame("manual").then(
        (save) => {
          if (!save) return void toast("No save to load.");
          restoreFrom(save);
          toast("Loaded.");
        },
        (err: unknown) => toast(err instanceof Error ? err.message : "Load failed."),
      );
    else if (k === "i")
      fileInput.click(); // SPEC-79: import a save file
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
      telemetry: () => getTelemetry(),
      save: async (): Promise<string> => {
        const save = makeSave(session.world, [], fingerprint);
        await saveGame("auto", save);
        return exportSave(save);
      },
    },
  });
}

void main();
