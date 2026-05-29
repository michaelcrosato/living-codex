import { describe, it, expect } from "vitest";
import { FactionId, ItemId, LocationId } from "@codex/content-schema";
import { createWorld } from "../state/world";
import { applyEvent } from "../events/apply";
import { effectToEvent } from "../events/effects";
import { evaluate } from "../conditions/conditions";
import { bribeSystem } from "./bribe";

const START = LocationId.parse("location.start");
const VARGA = FactionId.parse("faction.varga_crew");
const CREDITS = ItemId.parse("item.credits");
const world = () => createWorld({ seed: "s", startLocationId: START });

describe("bribe a faction — the T-16 extensibility verb, end to end", () => {
  it("BribeFaction deducts credits and raises standing when affordable", () => {
    let w = applyEvent(world(), { type: "GiveItem", itemId: CREDITS, count: 100 });
    w = applyEvent(w, { type: "BribeFaction", factionId: VARGA, cost: 50, standing: 5 });
    expect(w.inventory[CREDITS]).toBe(50);
    expect(w.reputation[VARGA]).toBe(5);
  });

  it("a bribe you can't afford is a no-op (chokepoint guard)", () => {
    const w = applyEvent(world(), { type: "GiveItem", itemId: CREDITS, count: 10 });
    const after = applyEvent(w, { type: "BribeFaction", factionId: VARGA, cost: 50, standing: 5 });
    expect(after.inventory[CREDITS]).toBe(10);
    expect(after.reputation[VARGA]).toBeUndefined();
  });

  it("the credits_at_least condition reads credits", () => {
    const w = applyEvent(world(), { type: "GiveItem", itemId: CREDITS, count: 60 });
    expect(evaluate(w, { kind: "credits_at_least", amount: 50 })).toBe(true);
    expect(evaluate(w, { kind: "credits_at_least", amount: 100 })).toBe(false);
  });

  it("bribeSystem forwards a Bribe input, and effectToEvent maps the effect, to BribeFaction", () => {
    const expected = { type: "BribeFaction", factionId: VARGA, cost: 50, standing: 5 } as const;
    expect(bribeSystem([{ type: "Bribe", factionId: VARGA, cost: 50, standing: 5 }])(world(), 0)).toEqual([
      expected,
    ]);
    expect(effectToEvent({ kind: "bribe_faction", factionId: VARGA, cost: 50, standing: 5 })).toEqual(
      expected,
    );
  });
});
