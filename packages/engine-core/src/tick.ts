import type { World } from "./state/world";
import type { GameEvent, InputEvent } from "./events/event";
import { applyEvent } from "./events/apply";
import type { ReplayEntry } from "./events/log";

/** Every system is a pure function of this shape (ARCHITECTURE.md §3). */
export type System = (world: World, dt: number) => GameEvent[];

export interface TickResult {
  world: World;
  /** Log entries produced this tick (inputs then events), to append to the ReplayLog. */
  entries: ReplayEntry[];
  events: GameEvent[];
}

/**
 * The single deterministic tick loop (WORLD_STATE.md §8), in this exact order every time:
 *   1. collect inputs → log them
 *   2. run systems in fixed registered order against the pre-tick world
 *   3. collect emitted events in order → log them
 *   4. apply events in order via applyEvent (the chokepoint; bounds enforced there)
 *   5. advance `tick` (rngState is persisted implicitly by applyEvent when events consume it)
 */
export function tick(
  world: World,
  inputs: readonly InputEvent[],
  systems: readonly System[],
  dt: number,
): TickResult {
  const at = world.tick;
  const entries: ReplayEntry[] = [];
  for (const input of inputs) entries.push({ tick: at, kind: "input", input });

  const events: GameEvent[] = [];
  for (const system of systems) events.push(...system(world, dt));

  let next = world;
  for (const event of events) {
    entries.push({ tick: at, kind: "event", event });
    next = applyEvent(next, event);
  }

  // Advance the tick as a logged event so replay reproduces World.tick exactly.
  const advance: GameEvent = { type: "AdvanceTick" };
  entries.push({ tick: at, kind: "event", event: advance });
  next = applyEvent(next, advance);

  return { world: next, entries, events };
}
