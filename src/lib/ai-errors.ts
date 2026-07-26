/** The Gemini SDK puts the raw JSON error body in `error.message`. Surfacing that
 *  verbatim dumps a wall of JSON into the UI, so translate the cases users
 *  actually hit into plain sentences. */
export function humanizeAiError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (!raw) return "Generation failed.";

  let code: number | undefined;
  let message = raw;
  let retrySeconds: number | undefined;

  try {
    const start = raw.indexOf("{");
    if (start !== -1) {
      const parsed = JSON.parse(raw.slice(start));
      const inner = parsed?.error ?? parsed;
      code = typeof inner?.code === "number" ? inner.code : undefined;
      if (typeof inner?.message === "string") message = inner.message;

      const retryInfo = (inner?.details ?? []).find((d: { retryDelay?: string }) => d?.retryDelay);
      const seconds = Number.parseFloat(String(retryInfo?.retryDelay ?? "").replace("s", ""));
      if (Number.isFinite(seconds)) retrySeconds = Math.ceil(seconds);
    }
  } catch {
    // Not JSON — fall through and use the raw text, trimmed below.
  }

  if (code === 429) {
    const wait = retrySeconds ? ` Try again in about ${retrySeconds}s.` : " Try again shortly.";
    return `Gemini rate limit reached — the free tier's quota is used up.${wait}`;
  }
  if (code === 404) {
    return "That Gemini model isn't available on this API key.";
  }
  if (code === 401 || code === 403) {
    return "Gemini rejected the API key. Check GEMINI_API_KEY in .env.";
  }
  if (code === 500 || code === 503) {
    return "Gemini is temporarily unavailable. Try again in a moment.";
  }

  const firstSentence = message.split("\n")[0].trim();
  return firstSentence.length > 180 ? `${firstSentence.slice(0, 177)}…` : firstSentence;
}
