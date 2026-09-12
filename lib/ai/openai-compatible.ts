import { AiServiceError, type AiProvider, type GenerateStructuredOptions } from "@/lib/ai/types";
import { extractAndParse } from "@/lib/ai/json";

// ---------------------------------------------------------------------------
// Generic OpenAI-compatible provider (chat/completions).
//
// Covers Groq, OpenRouter, and Mistral with a single REST
// implementation. Providers without an API key are simply never configured.
// JSON mode is requested via `response_format` and automatically retried
// without it when the model rejects the flag (common on some free models).
// ---------------------------------------------------------------------------

export interface OpenAiProviderConfig {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly apiKey: string;
  /** Candidate models in priority order. */
  readonly defaultModels: string[];
  /** Optional extra headers (e.g. OpenRouter attribution headers). */
  readonly extraHeaders?: Record<string, string>;
}

export function createOpenAiProvider(config: OpenAiProviderConfig): AiProvider {
  const models = config.defaultModels;
  const modelLabel = (m: string) => `"${m}"`;

  return {
    id: config.id,
    name: config.name,

    isConfigured: () => Boolean(config.apiKey),

    request: async <T = Record<string, unknown>>(options: GenerateStructuredOptions) => {
      const attempts: Array<{ model: string; jsonMode: boolean }> = [];
      for (const model of models) {
        attempts.push({ model, jsonMode: true });
        if (options.retryWithoutSchema !== false) {
          attempts.push({ model, jsonMode: false });
        }
      }

      let lastError: AiServiceError | null = null;

      for (const attempt of attempts) {
        try {
          const content = await chatCompletion(config, options, attempt.model, attempt.jsonMode);
          const data = extractAndParse<T>(content);
          if (data === null) {
            throw new AiServiceError(
              "invalid_response",
              `${config.name} returned content that could not be decoded as the expected JSON (model ${modelLabel(attempt.model)}).`
            );
          }
          return data;
        } catch (error) {
          const classified = classifyError(error, config.name, attempt.model);
          lastError = classified;
          if (classified.code === "model_unavailable") {
            continue; // try the next candidate model
          }
          if (attempt.jsonMode && classified.code === "generation_failed") {
            continue; // retry this model without response_format (queued next)
          }
          throw classified;
        }
      }

      throw (
        lastError ??
        new AiServiceError(
          "generation_failed",
          `${config.name}: no usable model could be reached (tried: ${models.map(modelLabel).join(", ")}).`
        )
      );
    },
  };
}

async function chatCompletion(
  config: OpenAiProviderConfig,
  options: GenerateStructuredOptions,
  model: string,
  jsonMode: boolean
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);

  try {
    const body: Record<string, unknown> = {
      model,
      temperature: options.temperature ?? 0.3,
      messages: [
        ...(options.system ? [{ role: "system", content: options.system }] : []),
        { role: "user", content: options.prompt },
      ],
    };
    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        ...config.extraHeaders,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await errorDetail(res);
      throw new AiServiceError(
        codeForStatus(res.status, detail),
        `${config.name} returned HTTP ${res.status}: ${detail || res.statusText}.`,
        { cause: { status: res.status } }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content.trim()) {
      throw new AiServiceError(
        "invalid_response",
        `${config.name} returned an empty response (model "${model}").`
      );
    }
    return content;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AiServiceError(
        "timeout",
        `${config.name} request timed out (model "${model}"). Please try again.`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function errorDetail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    if (typeof body?.error?.message === "string" && body.error.message) return body.error.message;
    return JSON.stringify(body).slice(0, 400);
  } catch {
    return "";
  }
}

function codeForStatus(status: number, detail: string): AiServiceError["code"] {
  const lower = detail.toLowerCase();
  if (lower.includes("safety") || lower.includes("content filter") || lower.includes("filtered") || lower.includes("moderation") || lower.includes("blocked") || lower.includes("policy")) {
    return "blocked";
  }
  // Unknown/deprecated model IDs often come back as 400 "model not found" too.
  if (
    lower.includes("not found") ||
    lower.includes("does not exist") ||
    lower.includes("invalid model") ||
    lower.includes("model not accessible")
  ) {
    return "model_unavailable";
  }
  switch (status) {
    case 401:
    case 403:
      return "auth_failed";
    case 404:
      return "model_unavailable";
    case 408:
      return "timeout";
    case 429:
      return "rate_limited";
    case 530:
      return "model_unavailable"; // OpenRouter: source provider error
    case 400:
      // JSON mode/schema rejection → retry without response_format.
      if (lower.includes("response_format") || lower.includes("response format") || lower.includes("json") || lower.includes("schema")) {
        return "generation_failed";
      }
      return "generation_failed";
    default:
      return "generation_failed";
  }
}

function classifyError(error: unknown, name: string, model: string): AiServiceError {
  if (error instanceof AiServiceError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  // fetch network-level rejections (connect refused, DNS, etc.).
  if (
    lower.includes("fetch failed") ||
    lower.includes("econnrefused") ||
    lower.includes("network") ||
    lower.includes("connection")
  ) {
    return new AiServiceError(
      "model_unavailable",
      `${name} could not be reached (model "${model}"). Check the service is running and reachable: ${message}.`,
      { cause: error }
    );
  }
  return new AiServiceError("generation_failed", `${name} request failed: ${message}`, { cause: error });
}