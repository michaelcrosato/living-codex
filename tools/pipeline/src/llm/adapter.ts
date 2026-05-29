import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodType } from "zod";

/**
 * The provider-agnostic LLM seam (CONTENT_PIPELINE.md §3). The pipeline's logic never names a
 * vendor — one file per provider implements `ModelProvider`, and swapping models (or moving to
 * local models later) is a one-file change, mirroring the engine's vendor-isolation rule. This
 * whole tree is OFFLINE: dependency-cruiser forbids any shipped package from importing tools/.
 */
export interface ModelRequest {
  system: string;
  user: string;
  /** JSON Schema to constrain structured output, when the provider supports it. */
  jsonSchema?: unknown;
  model?: string;
}

export interface ModelProvider {
  readonly name: string;
  complete(req: ModelRequest): Promise<string>;
}

export class StructuredGenerationError extends Error {
  constructor(
    message: string,
    readonly raw: string,
    readonly attempts: number,
  ) {
    super(message);
    this.name = "StructuredGenerationError";
  }
}

export interface GenerateOptions {
  system: string;
  user: string;
  model?: string;
  /** Number of repair retries after the first attempt (default 2 => up to 3 calls). */
  repairAttempts?: number;
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1]! : raw).trim();
}

function repairUser(original: string, badOutput: string, problem: string): string {
  return `${original}

Your previous output was invalid: ${problem}
Previous output:
${badOutput}

Return ONLY corrected JSON that satisfies the schema. No prose, no code fences.`;
}

/**
 * Call a provider and validate its output against a Zod schema, deriving the JSON Schema to
 * constrain the model. On a parse/validation failure it RE-PROMPTS with the error (auto-repair,
 * CONTENT_PIPELINE.md §4) up to `repairAttempts` times, then throws so the human is surfaced a
 * "needs attention" instead of silently dropping content.
 */
export async function generateStructured<T>(
  provider: ModelProvider,
  schema: ZodType<T>,
  opts: GenerateOptions,
): Promise<T> {
  const jsonSchema = zodToJsonSchema(schema, { $refStrategy: "none" });
  const maxAttempts = (opts.repairAttempts ?? 2) + 1;
  let user = opts.user;
  let lastRaw = "";
  let lastProblem = "unknown error";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    lastRaw = await provider.complete({
      system: opts.system,
      user,
      jsonSchema,
      ...(opts.model ? { model: opts.model } : {}),
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(lastRaw));
    } catch {
      lastProblem = "output was not valid JSON";
      user = repairUser(opts.user, lastRaw, lastProblem);
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) return result.data;

    lastProblem = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    user = repairUser(opts.user, lastRaw, lastProblem);
  }

  throw new StructuredGenerationError(
    `generateStructured(${provider.name}) failed after ${maxAttempts} attempt(s): ${lastProblem}`,
    lastRaw,
    maxAttempts,
  );
}
