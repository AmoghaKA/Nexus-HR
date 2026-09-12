import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  type GenerateContentResult,
} from "@google/generative-ai";

import { AiServiceError, type GenerateStructuredOptions } from "@/lib/ai/types";
import { extractAndParse } from "@/lib/ai/json";

// ---------------------------------------------------------------------------
// Google Gemini provider
//
// This module is ONLY the Gemini implementation. Errors are typed via the
// shared AiServiceError codes so the failover router in `lib/ai/router.ts`
// can switch to another provider when Gemini hits its free-tier rate limit.
// Server-side only — never expose the key to the browser.
// ---------------------------------------------------------------------------

export { AiServiceError } from "@/lib/ai/types";
export type { AiErrorCode, GenerateStructuredOptions } from "@/lib/ai/types";

const API_KEY = process.env.GEMINI_API_KEY ?? "";
const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"];

export const isGeminiConfigured = Boolean(API_KEY);

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

  const models = DEFAULT_MODELS;
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
      const data = extractAndParse<T>(textFromResult(result));
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