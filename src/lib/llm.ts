import { GoogleGenAI } from "@google/genai";

/**
 * One call path for every LLM feature, with cross-provider fallback.
 *
 * Provider order below is measured, not assumed. Same brief, same locked design
 * tokens, output rendered in a browser and inspected:
 *
 *   nemotron-3-ultra-550b  80-153s  11-36K chars  renders beautifully
 *                                   5 concurrent requests, zero rate limits
 *   gemini flash            ~27s    ~13K chars    renders beautifully
 *                                   but free quota exhausts quickly under load
 *   groq qwen3.6-27b        ~12s    ~13K chars    RENDERS BLANK
 *
 * qwen looked healthy on every proxy metric (char count, var() bindings, no
 * lorem) yet produced an empty page: Groq's free tier caps max_tokens around
 * 6000 (larger requests 413), and qwen spends that entire budget on CSS before
 * reaching <body>. It is therefore restricted to short structured output, where
 * truncation cannot bite, and never used for full pages.
 */

export const EMBEDDING_MODEL = "gemini-embedding-001";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Huge output ceiling (65K tokens) is what makes full-site generation safe. */
const OPENROUTER_LONG_MODELS = ["nvidia/nemotron-3-ultra-550b-a55b:free"];
const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"];
/** Short structured replies only — these truncate on long documents. */
const GROQ_SHORT_MODELS = ["llama-3.3-70b-versatile", "qwen/qwen3.6-27b"];

const GROQ_MAX_TOKENS = 6000;
/** Ultra's ceiling. A full eight-section site does not fit in less — capping
 *  this lower silently truncates the document mid-CSS. */
const OPENROUTER_MAX_TOKENS = 64000;

export function geminiClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(error: unknown) {
  return /\b(429|404|413|500|502|503)\b/.test(String((error as Error)?.message ?? error));
}

function suggestedDelayMs(error: unknown): number | null {
  const match = String((error as Error)?.message ?? error).match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return match ? Math.ceil(Number.parseFloat(match[1]) * 1000) : null;
}

/** Flattens Gemini's `contents` union to a plain string. Returns null when the
 *  payload carries an image, since only Gemini can accept those here. */
function toPlainPrompt(contents: unknown): string | null {
  if (typeof contents === "string") return contents;
  if (Array.isArray(contents)) {
    const text = contents.filter((part) => typeof part === "string").join("\n");
    return text.trim() ? text : null;
  }
  const parts = (contents as { parts?: { text?: string; inlineData?: unknown }[] })?.parts;
  if (Array.isArray(parts)) {
    if (parts.some((p) => p?.inlineData)) return null;
    const text = parts.map((p) => p?.text ?? "").join("\n");
    return text.trim() ? text : null;
  }
  return null;
}

/** Free-tier quota is per key, so several keys mean several independent pools. */
function apiKeys(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

async function callOpenAICompatible(params: {
  url: string;
  apiKeys: string[];
  models: string[];
  prompt: string;
  maxTokens: number;
  wantsJson: boolean;
}): Promise<string> {
  let lastError: unknown;
  for (const model of params.models) {
    for (const apiKey of params.apiKeys) {
      try {
        const response = await fetch(params.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: params.prompt }],
            max_tokens: params.maxTokens,
            ...(params.wantsJson ? { response_format: { type: "json_object" } } : {}),
          }),
        });

        if (!response.ok) {
          lastError = new Error(`${response.status}: ${(await response.text()).slice(0, 200)}`);
          continue;
        }

        const json = await response.json();
        if (json?.error) {
          lastError = new Error(JSON.stringify(json.error).slice(0, 200));
          continue;
        }

        const text: string = json?.choices?.[0]?.message?.content ?? "";
        if (text.trim()) return text;
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw lastError ?? new Error("No model returned a response.");
}

export interface LlmCallOptions {
  contents: unknown;
  config?: Record<string, unknown>;
  /** `long` routes to models proven to finish a full document. */
  length?: "long" | "short";
  maxRounds?: number;
}

export async function callLLM({
  contents,
  config,
  length = "long",
  maxRounds = 2,
}: LlmCallOptions): Promise<string> {
  const wantsJson = config?.responseMimeType === "application/json";
  const plainPrompt = toPlainPrompt(contents);
  const jsonSuffix = wantsJson ? "\n\nRespond with valid JSON only — no prose, no markdown fences." : "";
  const openRouterKeys = apiKeys(process.env.OPENROUTER_API_KEY);
  let lastError: unknown;

  for (let round = 0; round < maxRounds; round++) {
    // Long-form work goes to the model with the output headroom to finish.
    if (length === "long" && openRouterKeys.length && plainPrompt) {
      try {
        return await callOpenAICompatible({
          url: OPENROUTER_URL,
          apiKeys: openRouterKeys,
          models: OPENROUTER_LONG_MODELS,
          prompt: plainPrompt + jsonSuffix,
          maxTokens: OPENROUTER_MAX_TOKENS,
          wantsJson,
        });
      } catch (error) {
        lastError = error;
      }
    }

    if (process.env.GEMINI_API_KEY) {
      for (const model of GEMINI_MODELS) {
        try {
          const response = await geminiClient().models.generateContent({
            model,
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
    }

    // Groq is last and short-only: it truncates full documents into blank pages.
    if (length === "short" && process.env.GROQ_API_KEY && plainPrompt) {
      try {
        return await callOpenAICompatible({
          url: GROQ_URL,
          apiKeys: apiKeys(process.env.GROQ_API_KEY),
          models: GROQ_SHORT_MODELS,
          prompt: plainPrompt + jsonSuffix,
          maxTokens: GROQ_MAX_TOKENS,
          wantsJson,
        });
      } catch (error) {
        lastError = error;
      }
    }

    if (round < maxRounds - 1) {
      await sleep(Math.min(suggestedDelayMs(lastError) ?? 20_000, 65_000));
    }
  }

  throw lastError ?? new Error("Every configured model refused the request.");
}
