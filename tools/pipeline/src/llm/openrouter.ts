import type { ModelProvider, ModelRequest } from "./adapter";

/**
 * The one real provider (CONTENT_PIPELINE.md §3). A unified router (OpenRouter-style) so the
 * Architect/Dramatist/Loremaster/Critic models are config, not code. Only ever used when an API
 * key is configured; tests use StubProvider, so `pnpm verify` stays hermetic and offline.
 */
export interface OpenRouterOptions {
  apiKey: string;
  /** Default model id, overridable per request (per role). */
  model: string;
  baseUrl?: string;
}

interface ChatCompletion {
  choices: { message: { content: string } }[];
}

export class OpenRouterProvider implements ModelProvider {
  readonly name = "openrouter";
  constructor(private readonly opts: OpenRouterOptions) {}

  async complete(req: ModelRequest): Promise<string> {
    const base = this.opts.baseUrl ?? "https://openrouter.ai/api/v1";
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.opts.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model ?? this.opts.model,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user },
        ],
        ...(req.jsonSchema
          ? {
              response_format: {
                type: "json_schema",
                json_schema: { name: "proposal", schema: req.jsonSchema, strict: true },
              },
            }
          : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as ChatCompletion;
    return data.choices[0]?.message.content ?? "";
  }
}
