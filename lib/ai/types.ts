import type { Schema } from "@google/generative-ai";

// ---------------------------------------------------------------------------
// Shared types for the AI provider layer.
//
// Every provider (Gemini, Groq, OpenRouter, Mistral, ...)
// implements the same AiProvider contract and is called through the failover
// router in `lib/ai/router.ts`. These modules are server-side only and must
// never be imported from client components.
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

export interface GenerateStructuredOptions {
  /** Optional system instruction (guardrails, output contract). */
  system?: string;
  /** User-facing prompt. Should contain the structured signal package. */
  prompt: string;
  /** Optional JSON schema (Gemini native). Other providers use JSON mode. */
  schema?: Schema;
  /** Sampling temperature. Lower = more deterministic. Defaults to 0.3. */
  temperature?: number;
  /** Per-request timeout in milliseconds. Defaults to 25_000. */
  timeoutMs?: number;
  /**
   * When true (default) and the provider rejects the JSON-mode/schema
   * combination, retries once with plain text output.
   */
  retryWithoutSchema?: boolean;
}

export interface AiProvider {
  readonly id: string;
  readonly name: string;
  /** Whether this provider is usable given current environment configuration. */
  isConfigured(): boolean;
  /**
   * Runs the model and returns the parsed payload as T. Must throw
   * AiServiceError on failure (typed via code) so the router can fail over.
   */
  request<T = Record<string, unknown>>(options: GenerateStructuredOptions): Promise<T>;
}