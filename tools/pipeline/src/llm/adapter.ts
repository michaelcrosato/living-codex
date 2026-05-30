import { z } from "zod";

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

/** Extract the first balanced {…} or […] block, respecting strings/escapes (handles JSON embedded
 *  in chain-of-thought prose). Returns null if none. */
function extractBalanced(s: string): string | null {
  const start = s.search(/[{[]/);
  if (start < 0) return null;
  const open = s[start]!;
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i]!;
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) return s.slice(start, i + 1);
  }
  return null;
}

/** Drop trailing commas before } or ] — string-aware, so a literal ",}" inside a string survives. */
function stripTrailingCommas(s: string): string {
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inStr) {
      out += ch;
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }
    if (ch === ",") {
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j]!)) j++;
      if (j < s.length && (s[j] === "}" || s[j] === "]")) continue; // skip the trailing comma
    }
    out += ch;
  }
  return out;
}

function tryParse(s: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch {
    return { ok: false };
  }
}

/**
 * Tolerant pre-parse (Schema-Aligned Parsing, SPEC-12): recover a JSON value from the common,
 * cheap-to-fix LLM malformations — markdown code fences, prose/chain-of-thought around the JSON,
 * and trailing commas — BEFORE spending an expensive repair re-prompt. Throws only when no JSON
 * value is recoverable. The result is still Zod-validated by the caller, so a bad recovery just
 * falls through to the normal repair loop.
 */
export function tolerantParse(raw: string): unknown {
  const trimmed = raw.trim();
  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1]!.trim());
  const balanced = extractBalanced(trimmed);
  if (balanced) candidates.push(balanced);

  for (const c of candidates) {
    const direct = tryParse(c);
    if (direct.ok) return direct.value;
    const repaired = stripTrailingCommas(c);
    if (repaired !== c) {
      const reparsed = tryParse(repaired);
      if (reparsed.ok) return reparsed.value;
    }
  }
  throw new SyntaxError("no recoverable JSON value in output");
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
 * constrain the model. Output first goes through a tolerant pre-parse (`tolerantParse`) that
 * recovers fences/prose-wrapped JSON/trailing commas WITHOUT a re-prompt; only a genuine
 * parse/validation failure RE-PROMPTS with the error (auto-repair, CONTENT_PIPELINE.md §4) up to
 * `repairAttempts` times, then throws so the human is surfaced a "needs attention" instead of
 * silently dropping content.
 */
export async function generateStructured<S extends z.ZodTypeAny>(
  provider: ModelProvider,
  schema: S,
  opts: GenerateOptions,
): Promise<z.output<S>> {
  const jsonSchema = z.toJSONSchema(schema, { unrepresentable: "any" });
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
      parsed = tolerantParse(lastRaw);
    } catch {
      lastProblem = "output contained no recoverable JSON";
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
