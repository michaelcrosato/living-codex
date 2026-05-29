import type { ModelProvider, ModelRequest } from "./adapter";

/**
 * A deterministic provider for hermetic tests and offline dry-runs — NO network. You supply a
 * `respond` function (or a map keyed by role/marker) so a fixed brief + fixed stub yields a
 * byte-stable result, which is what makes the pipeline's golden-master test possible (P2).
 */
export class StubProvider implements ModelProvider {
  readonly name = "stub";
  constructor(private readonly respond: (req: ModelRequest) => string) {}
  complete(req: ModelRequest): Promise<string> {
    return Promise.resolve(this.respond(req));
  }
}

/** Build a stub whose response is chosen by a substring found in the system prompt (the role). */
export function stubByRole(responses: Record<string, string>, fallback = "{}"): StubProvider {
  return new StubProvider((req) => {
    for (const [marker, body] of Object.entries(responses)) {
      if (req.system.includes(marker)) return body;
    }
    return fallback;
  });
}
