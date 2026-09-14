import { AiServiceError, type AiProvider, type GenerateStructuredOptions } from "@/lib/ai/types";
import { generateStructuredJSON as geminiStructuredJSON } from "@/lib/ai/gemini";
import { createOpenAiProvider } from "@/lib/ai/openai-compatible";

// ---------------------------------------------------------------------------
// AI provider router.
//
// Qwen is the primary AI engine (reasoning, content generation, and
// decision-making). It is served over DashScope's OpenAI-compatible endpoint,
// and the router automatically falls back to the next configured provider only
// when Qwen is unavailable (free-tier rate limit, timeout, rejected key,
// unavailable model) so callers in `lib/ai/features.ts` are unchanged.
// Providers that fail with an outage-class error are put on a short in-memory
// cooldown so subsequent requests skip straight to a healthy provider instead
// of hammering a rate-limited one.
//
// Server-side only (relies on process.env and in-memory state).
// ---------------------------------------------------------------------------

type RuntimeProviderId = "qwen" | "gemini" | "openrouter" | "groq" | "mistral";

const ALL_PROVIDERS: AiProvider[] = [
  createOpenAiProvider({
    id: "qwen",
    name: "Qwen (DashScope)",
    baseUrl:
      process.env.QWEN_BASE_URL ??
      "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "",
    defaultModels: [
      process.env.QWEN_MODEL || "qwen-max",
      "qwen-plus",
      "qwen-turbo",
    ],
  }),
  {
    id: "gemini",
    name: "Google Gemini",
    isConfigured: () => Boolean(process.env.GEMINI_API_KEY),
    request: geminiStructuredJSON,
  },
  createOpenAiProvider({
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    defaultModels: [
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "openai/gpt-oss-20b:free",
      "google/gemma-4-31b-it:free",
    ],
    extraHeaders: {
      "HTTP-Referer": "https://nexushr.local",
      "X-Title": "Nexus HR",
    },
  }),
  createOpenAiProvider({
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY ?? "",
    defaultModels: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"],
  }),
  createOpenAiProvider({
    id: "mistral",
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    apiKey: process.env.MISTRAL_API_KEY ?? "",
    defaultModels: ["mistral-small-latest", "ministral-8b-latest", "mistral-medium-latest"],
  }),
];

const DEFAULT_ORDER: RuntimeProviderId[] = ["qwen", "gemini", "openrouter", "groq", "mistral"];

const COOLDOWN_MS = Math.max(0, Number(process.env.AI_PROVIDER_COOLDOWN_MS ?? 5_000) || 5_000);

// Outage-class codes put the provider on cooldown. Per-attempt codes like
// invalid_response do not (they are specific to one bad response).
const COOLDOWN_CODES: ReadonlySet<AiServiceError["code"]> = new Set([
  "rate_limited",
  "timeout",
  "auth_failed",
  "model_unavailable",
]);

const cooldowns = new Map<string, number>();

function applyCooldown(id: string): void {
  if (COOLDOWN_MS > 0) {
    cooldowns.set(id, Date.now() + COOLDOWN_MS);
    if (cooldowns.size > 32) {
      const oldest = cooldowns.keys().next().value;
      if (oldest !== undefined) cooldowns.delete(oldest);
    }
  }
}

export function isProviderCoolingDown(id: string): boolean {
  const until = cooldowns.get(id);
  if (until === undefined) return false;
  if (Date.now() >= until) {
    cooldowns.delete(id);
    return false;
  }
  return true;
}

/** Resets all provider cooldowns (useful for tests / diagnostics). */
export function resetProviderCooldowns(): void {
  cooldowns.clear();
}

/** Providers in priority order that pass BOTH config and cooldown checks. */
function activeProviders(): AiProvider[] {
  const order = (process.env.AI_PROVIDER_ORDER ?? DEFAULT_ORDER.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    order
      .map<AiProvider | undefined>((id) =>
        ALL_PROVIDERS.find((p) => p.id === id)
      )
      .filter((p): p is AiProvider => Boolean(p))
      .filter((p) => p.isConfigured())
  );
}

/**
 * Reports each known provider and whether it is currently enabled. Used by the
 * health endpoint so support can see which fallbacks are wired up.
 */
export function getConfiguredProviders(): Array<{ id: string; name: string; enabled: boolean }> {
  return ALL_PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    enabled: p.isConfigured(),
  }));
}

export function describeProviderConfig(): string {
  const order = (process.env.AI_PROVIDER_ORDER ?? DEFAULT_ORDER.join(",")).split(",").map((s) => s.trim());
  return order
    .map((id) => {
      const p = ALL_PROVIDERS.find((x) => x.id === id);
      return p ? `${p.name} (${p.isConfigured() ? "configured" : "not configured"})` : `"${id}" (unknown)`;
    })
    .join(", ");
}

/**
 * Runs whatever model provider is available, automatically failing over
 * between configured providers when one is unavailable (rate limited,
 * unreachable, out of quota, or rejected). Same signature as the original
 * Qwen entry point, so callers are unchanged.
 */
export async function generateStructuredJSON<T = Record<string, unknown>>(
  options: GenerateStructuredOptions
): Promise<T> {
  const tried: Array<{ provider: string; code: AiServiceError["code"]; message: string }> = [];

  for (const provider of activeProviders()) {
    if (isProviderCoolingDown(provider.id)) continue;

    try {
      const value = await provider.request<T>(options);
      return value;
    } catch (error) {
      const classified =
        error instanceof AiServiceError
          ? error
          : new AiServiceError(
              "generation_failed",
              error instanceof Error ? error.message : String(error)
            );

      tried.push({ provider: provider.id, code: classified.code, message: classified.message });

      console.warn(
        `[ai-router] ${provider.name} failed with ${classified.code}. Failing over to the next provider. ${classified.message}`
      );

      if (COOLDOWN_CODES.has(classified.code)) {
        applyCooldown(provider.id);
      }
    }
  }

  const details = tried
    .map((t) => `  ${t.provider}: ${t.code} — ${t.message.trim().slice(0, 240)}`)
    .join("\n");
  const summary =
    tried.length > 0
      ? tried.map((t) => `${t.provider} (${t.code})`).join(", ")
      : "none — no provider is configured";

  throw new AiServiceError(
    "generation_failed",
    `All AI providers failed. Tried: ${summary}.\n${details}`,
    { cause: tried[0] }
  );
}

export { AiServiceError };
export type { AiProvider, GenerateStructuredOptions } from "@/lib/ai/types";