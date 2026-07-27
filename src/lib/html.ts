/**
 * Shared handling for model-produced HTML.
 *
 * Both variant generation and component generation hit the same failure modes,
 * so they share one contract rather than each trusting the prompt:
 *   - markdown fences wrapped around the document despite instructions
 *   - a sentence of preamble before <!DOCTYPE>
 *   - a missing doctype, which silently drops the iframe into quirks mode
 *   - truncation mid-CSS, which looks healthy by character count while
 *     containing no <body> at all (observed: a 13K-char response that rendered
 *     a completely blank page)
 *   - raw stylesheet text leaking into the body as visible gibberish
 */

/** Normalizes a model response into a renderable document, or throws. */
export function normalizeHtmlDocument(text: string): string {
  let html = text.trim();

  const fenced = html.match(/```(?:html)?\s*\n([\s\S]*?)```/);
  if (fenced) html = fenced[1].trim();

  const start = html.search(/<!DOCTYPE html|<html[\s>]/i);
  if (start > 0) html = html.slice(start).trim();

  if (html && !/^<!DOCTYPE/i.test(html)) html = `<!DOCTYPE html>\n${html}`;

  html = stripEmDashes(html);

  assertRenderable(html);
  return html;
}

/**
 * The rulebook bans the em-dash outright and the model ignores it anyway — one
 * audited page carried twenty-one. Prompting is the wrong tool for a rule this
 * mechanical, so enforce it here. Only visible text is touched; <style> and
 * <script> are left alone, where the character can be load-bearing.
 */
export function stripEmDashes(html: string): string {
  return html.replace(
    /<(style|script)\b[\s\S]*?<\/\1>|[—–]/gi,
    (match) => (match.length > 1 ? match : "-")
  );
}

/** Throws when a document would render blank or visibly broken. */
export function assertRenderable(html: string) {
  if (!html) throw new Error("Model returned an empty document.");

  if (!/<\/html>/i.test(html) || !/<\/body>/i.test(html)) {
    throw new Error("Model output was cut off before the document finished — try again.");
  }

  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";
  if (!/<[a-z]/i.test(body)) {
    throw new Error("Model produced styles but no page content — try again.");
  }

  assertNoLeakedCss(body);
}

/** CSS outside a <style> block renders as visible text on the page. */
export function assertNoLeakedCss(markup: string) {
  const visible = markup
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  if (/[.#][\w-]+\s*\{[^}]*(?:display|color|margin|padding|font)\s*:/i.test(visible)) {
    throw new Error("Model leaked raw CSS into the page body — try again.");
  }
}

/** Normalizes a response expected to be a fragment (one component), not a whole
 *  document. Same fence/preamble handling, but no doctype or <body> to check. */
export function normalizeHtmlFragment(text: string): string {
  let html = text.trim();

  const fenced = html.match(/```(?:html)?\s*\n([\s\S]*?)```/);
  if (fenced) html = fenced[1].trim();

  // Drop any prose before the first tag.
  const start = html.search(/<[a-z]/i);
  if (start > 0) html = html.slice(start).trim();

  if (!html || !/<[a-z]/i.test(html)) {
    throw new Error("Model returned no markup — try again.");
  }

  assertNoLeakedCss(html);
  return html;
}
