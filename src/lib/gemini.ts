import { GoogleGenAI } from "@google/genai";

/** Descending capability. Free-tier keys carry per-model quota that varies
 *  (Pro tiers frequently sit at limit: 0), so callers fall through rather than
 *  hard-failing on the first refusal. */
export const AUTHOR_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"];
export const FAST_MODEL = "gemini-flash-latest";
export const EMBEDDING_MODEL = "gemini-embedding-001";

export function geminiClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** True for failures that are about availability rather than the request itself. */
function isRetryable(error: unknown) {
  const message = String((error as Error)?.message ?? error);
  return message.includes("429") || message.includes("404") || message.includes("503");
}

/** Reads the server's own retryDelay when it offers one, so we wait the actual
 *  window instead of guessing. */
function suggestedDelayMs(error: unknown): number | null {
  const raw = String((error as Error)?.message ?? error);
  const match = raw.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (!match) return null;
  return Math.ceil(Number.parseFloat(match[1]) * 1000);
}

interface CallOptions {
  contents: unknown;
  config?: Record<string, unknown>;
  models?: string[];
  maxRounds?: number;
}

/**
 * Calls Gemini, walking the model list and then backing off, so a burst of
 * parallel work doesn't turn a transient per-minute quota into a hard failure.
 * Returns the response text.
 */
export async function callGemini({ contents, config, models = AUTHOR_MODELS, maxRounds = 3 }: CallOptions): Promise<string> {
  let lastError: unknown;

  for (let round = 0; round < maxRounds; round++) {
    for (const model of models) {
      try {
        const response = await geminiClient().models.generateContent({
          model,
          // The SDK's contents union is wider than we model here.
          contents: contents as never,
          ...(config ? { config } : {}),
        });
        const text = response.text ?? "";
        if (text.trim()) return text;
      } catch (error) {
        lastError = error;
        if (!isRetryable(error)) throw error;
      }
    }

    if (round < maxRounds - 1) {
      const suggested = suggestedDelayMs(lastError);
      await sleep(Math.min(suggested ?? 20_000 * (round + 1), 65_000));
    }
  }

  throw lastError ?? new Error("No available Gemini model returned a response.");
}
