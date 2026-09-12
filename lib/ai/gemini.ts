import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  type GenerateContentResult,
  type Schema,
} from "@google/generative-ai";

// ---------------------------------------------------------------------------
// Reusable Gemini service
//
// This module is the ONLY place that talks to the Gemini API, and it must
// never be imported from client components ("use client"). The key is read
// from the server-side environment (GEMINI_API_KEY) and never sent to the
// browser.
// ---------------------------------------------------------------------------

export type AiErrorCode =
  | "not_configured"
  | "auth_failed"
  | "model_unavailable"
  | "rate_limited"
  | "timeout"
  | "blocked"
  | "invalid_response"
  | "generation_failed";

export class AiServiceError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiServiceError";
    this.code = code;
  }
}

const API_KEY = process.env.GEMINI_API_KEY ?? "";
const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"];

export const isGeminiConfigured = Boolean(API_KEY);

function uniqueStrings(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v))));
}

/** Candidate models for structured JSON generation, in priority order. */
function modelCandidates(extra?: string[]): string[] {
  return uniqueStrings([
    process.env.GEMINI_MODEL ?? "",
    ...DEFAULT_MODELS,
    ...(extra ?? []),
  ]);
}

let geminiClient: GoogleGenerativeAI | null = null;

/**
 * Returns the shared Gemini client. Server-side only.
 */
export function getGeminiClient(): GoogleGenerativeAI | null {
  if (!API_KEY) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(API_KEY);
  }
  return geminiClient;
}

export interface GenerateStructuredOptions {
  /** Optional system instruction (guardrails, output contract). */
  system?: string;
  /** User-facing prompt. Should contain the structured signal package. */
  prompt: string;
  /** Optional JSON schema. When omitted the model is told to return JSON in the prompt. */
  schema?: Schema;
  /** Sampling temperature. Lower = more deterministic. Defaults to 0.3. */
  temperature?: number;
  /** Per-request timeout in milliseconds. Defaults to 45_000. */
  timeoutMs?: number;
  /** Additional model names to fall back to (after the defaults). */
  fallbackModels?: string[];
  /**
   * When true (default) and the model errors while the schema was provided,
   * retries once without the schema (some models only support JSON mode).
   */
  retryWithoutSchema?: boolean;
}

interface RequestAttempt {
  model: string;
  useSchema: boolean;
}

/**
 * Runs the Gemini model with JSON output and returns the parsed payload as T.
 *
 * Handles, with graceful, typed errors:
 *  - missing GEMINI_API_KEY            -> not_configured
 *  - invalid/unauthorized key          -> auth_failed
 *  - unknown/inaccessible model        -> model_unavailable (falls through the candidate list)
 *  - quota / 429 rate limits           -> rate_limited
 *  - request timeout / abort           -> timeout
 *  - safety block                      -> blocked
 *  - unsafe JSON (malformed/no fields) -> invalid_response
 */
export async function generateStructuredJSON<T = Record<string, unknown>>(
  options: GenerateStructuredOptions
): Promise<T> {
  const client = getGeminiClient();
  if (!client) {
    throw new AiServiceError(
      "not_configured",
      "Gemini is not configured. Add GEMINI_API_KEY to .env.local to enable AI features."
    );
  }

  const models = modelCandidates(options.fallbackModels);
  const attempts: RequestAttempt[] = [];
  for (const model of models) {
    attempts.push({ model, useSchema: Boolean(options.schema) });
    if (options.schema && options.retryWithoutSchema !== false) {
      attempts.push({ model, useSchema: false });
    }
  }

  const fallbackErrors: Error[] = [];

  for (const attempt of attempts) {
    try {
      const result = await requestModel(client, options, attempt);
      const data = extractAndParse<T>(result);
      if (data === null) {
        throw new AiServiceError(
          "invalid_response",
          "Gemini returned content that could not be decoded as the expected JSON."
        );
      }
      return data;
    } catch (error) {
      const classified = classifyError(error, attempt.model);
      if (classified.code === "model_unavailable") {
        fallbackErrors.push(classified);
        continue; // try the next candidate model
      }
      if (attempt.useSchema && classified.code === "generation_failed" && options.schema) {
        // Schema-specific API rejection (e.g. model does not support responseSchema).
        continue; // the no-schema attempt for this model is queued next
      }
      throw classified;
    }
  }

  throw new AiServiceError(
    "model_unavailable",
    `No usable Gemini model could be reached (tried: ${models.map((m) => `"${m}"`).join(", ")}). ${
      fallbackErrors.map((e) => e.message).join(" ") || "Please check the model name and API quota."
    }`,
    { cause: fallbackErrors[fallbackErrors.length - 1] }
  );
}

async function requestModel(
  client: GoogleGenerativeAI,
  options: GenerateStructuredOptions,
  attempt: RequestAttempt
): Promise<GenerateContentResult> {
  const model = client.getGenerativeModel({
    model: attempt.model,
    systemInstruction: options.system,
    generationConfig: {
      temperature: options.temperature ?? 0.3,
      responseMimeType: "application/json",
      ...(attempt.useSchema && options.schema ? { responseSchema: options.schema } : {}),
    },
  });
  return model.generateContent(options.prompt, {
    timeout: options.timeoutMs ?? 45_000,
  });
}

function classifyError(error: unknown, model: string): AiServiceError {
  if (error instanceof AiServiceError) return error;

  const message = error instanceof Error ? error.message : String(error);

  if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
    return new AiServiceError("timeout", `Gemini request timed out (model "${model}"). Please try again.`, {
      cause: error,
    });
  }
  if (error instanceof GoogleGenerativeAIFetchError) {
    switch (error.status) {
      case 401:
      case 403:
        return new AiServiceError(
          "auth_failed",
          "The Gemini API key was rejected. Check GEMINI_API_KEY in .env.local.",
          { cause: error }
        );
      case 404:
        return new AiServiceError("model_unavailable", `Gemini model "${model}" is not available.`, {
          cause: error,
        });
      case 429:
        return new AiServiceError(
          "rate_limited",
          "Gemini free-tier rate limit reached. Wait a moment and try again.",
          { cause: error }
        );
      default:
        break;
    }
  }

  const lower = message.toLowerCase();
  if (lower.includes("not found") || lower.includes("models/") || lower.includes("model does not exist")) {
    return new AiServiceError("model_unavailable", `Gemini model "${model}" is not available.`, { cause: error });
  }
  if (lower.includes("quota") || lower.includes("resource exhausted") || lower.includes("rate limit")) {
    return new AiServiceError("rate_limited", "Gemini free-tier quota reached. Please try again later.", {
      cause: error,
    });
  }
  if (lower.includes("safety") || lower.includes("blocked") || lower.includes("prompt blocked")) {
    return new AiServiceError("blocked", "Gemini blocked the request for safety reasons.", { cause: error });
  }
  if (
    lower.includes("response schema") ||
    lower.includes("responseschema") ||
    lower.includes("schema") ||
    lower.includes("mimetype") ||
    lower.includes("json mode") ||
    lower.includes("response_mime_type")
  ) {
    // The model rejected the schema / JSON-mode combination — drop schema and retry.
    return new AiServiceError("generation_failed", "Schema output unsupported for this model.", { cause: error });
  }
  return new AiServiceError("generation_failed", `Gemini request failed: ${message}`, { cause: error });
}

function textFromResult(result: GenerateContentResult): string {
  const text = result.response?.text?.();
  if (typeof text === "string") return text;
  // Fallback: pull the first text part out of the first candidate.
  const first = result.response?.candidates?.[0]?.content?.parts?.[0];
  if (first && "text" in first && typeof first.text === "string") return first.text;
  return "";
}

/**
 * Parses JSON from a Gemini response, tolerating markdown fences and stray
 * prose around the JSON document.
 */
function extractAndParse<T>(result: GenerateContentResult): T | null {
  const text = textFromResult(result).trim();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    // Strip ```json ... ``` (or ``` ... ```) fences.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim()) as T;
      } catch {
        /* fall through */
      }
    }
    // Fall back to the first balanced JSON object.
    const object = extractBalancedJson(text, "{", "}");
    if (object) {
      try {
        return JSON.parse(object) as T;
      } catch {
        /* fall through */
      }
    }
    const array = extractBalancedJson(text, "[", "]");
    if (array) {
      try {
        return JSON.parse(array) as T;
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

function extractBalancedJson(text: string, open: string, close: string): string | null {
  const start = text.indexOf(open);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") {
        i += 1;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === open) {
      depth += 1;
    } else if (ch === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}