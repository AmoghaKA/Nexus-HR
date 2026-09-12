import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKey = process.env.GEMINI_API_KEY;

let geminiClient: GoogleGenerativeAI | null = null;

/**
 * Returns a Gemini client scoped to the free-tier model, or null when the
 * GEMINI_API_KEY environment variable has not been configured.
 *
 * AI features are intentionally not wired up yet. This is the single entry
 * point the workforce-briefing features will use later.
 */
export function getGeminiClient() {
  if (!geminiApiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(geminiApiKey);
  }
  return geminiClient;
}

export function getGeminiModel() {
  const client = getGeminiClient();
  if (!client) return null;
  return client.getGenerativeModel({ model: "gemini-2.0-flash" });
}

export const isGeminiConfigured = Boolean(geminiApiKey);