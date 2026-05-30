import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock idb-keyval so we can drive `set` failures (quota vs other) — the round-trip tests in store.test.ts
// use the real store; this file isolates saveGame's error branches (SPEC-103).
const setMock = vi.fn();
vi.mock("idb-keyval", () => ({
  createStore: () => ({}),
  set: (...args: unknown[]) => setMock(...args),
  get: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
}));

import { saveGame, SaveQuotaError } from "./store";

const SAVE = {} as never; // the mock ignores the payload

describe("saveGame error handling (SPEC-103)", () => {
  beforeEach(() => setMock.mockReset());

  it("wraps a QuotaExceededError DOMException as SaveQuotaError (named, with the slot)", async () => {
    setMock.mockRejectedValueOnce(new DOMException("over quota", "QuotaExceededError"));
    await expect(saveGame("manual", SAVE)).rejects.toBeInstanceOf(SaveQuotaError);
    setMock.mockRejectedValueOnce(new DOMException("over quota", "QuotaExceededError"));
    await expect(saveGame("manual", SAVE)).rejects.toThrow(/quota exceeded.*manual/);
  });

  it("re-throws any non-quota error unchanged (not wrapped as SaveQuotaError)", async () => {
    setMock.mockRejectedValueOnce(new Error("disk on fire"));
    await expect(saveGame("manual", SAVE)).rejects.toThrow(/disk on fire/);
    setMock.mockRejectedValueOnce(new Error("disk on fire"));
    await expect(saveGame("manual", SAVE)).rejects.not.toBeInstanceOf(SaveQuotaError);
  });

  it("resolves when set succeeds", async () => {
    setMock.mockResolvedValueOnce(undefined);
    await expect(saveGame("manual", SAVE)).resolves.toBeUndefined();
  });
});
