/**
 * Pulls reusable sections out of a generated site.
 *
 * Deliberately depth-aware rather than regex-per-tag: a real generated page
 * contains ~18 <section>/<header>/<nav>/<footer> tags, but only ~8 of them are
 * top-level sections. The rest are nested headers inside cards and testimonials.
 * Counting nesting is what separates "the pricing section" from "a heading
 * inside the pricing section".
 */

export const COMPONENT_CATEGORIES = [
  "Hero",
  "Navbar",
  "Cards",
  "Testimonials",
  "Pricing",
  "CTA",
  "FAQ",
  "Footer",
  "Timeline",
  "Buttons",
  "Form",
  "Other",
] as const;

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number];

export interface ExtractedSection {
  tag: string;
  id: string | null;
  className: string | null;
  html: string;
  category: ComponentCategory;
  name: string;
}

/** Elements that never have a closing tag, so they must not affect depth. */
const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr",
  // Common inline SVG children, which appear unclosed in generated markup.
  "path", "circle", "rect", "line", "polygon", "polyline", "ellipse", "use", "stop",
]);

/** Structural wrappers we skip rather than offer as components. */
const SKIP_CLASSES = ["skip-link", "sr-only", "visually-hidden"];

function attr(raw: string, name: string): string | null {
  const match = raw.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  return match ? match[1] : null;
}

/** Returns the direct element children of the given markup. */
function topLevelChildren(markup: string) {
  const results: { tag: string; id: string | null; className: string | null; html: string }[] = [];
  const tagRe = /<(\/?)([a-z][\w-]*)([^>]*)>/gi;
  let depth = 0;
  let open: { tag: string; raw: string; start: number } | null = null;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(markup))) {
    const isClosing = match[1] === "/";
    const tag = match[2].toLowerCase();
    const raw = match[3] ?? "";
    const selfClosing = raw.trim().endsWith("/");

    if (VOID_TAGS.has(tag) || selfClosing) continue;

    if (!isClosing) {
      if (depth === 0) open = { tag, raw, start: match.index };
      depth++;
    } else {
      depth--;
      if (depth === 0 && open) {
        results.push({
          tag: open.tag,
          id: attr(open.raw, "id"),
          className: attr(open.raw, "class"),
          html: markup.slice(open.start, match.index + match[0].length),
        });
        open = null;
      }
      if (depth < 0) depth = 0; // tolerate stray closing tags
    }
  }

  return results;
}

/** Best-guess category from the section's own naming. User can override. */
export function guessCategory(input: { tag: string; id?: string | null; className?: string | null }): ComponentCategory {
  const hay = `${input.tag} ${input.id ?? ""} ${input.className ?? ""}`.toLowerCase();

  if (/\bhero\b/.test(hay)) return "Hero";
  if (/\bfooter\b/.test(hay)) return "Footer";
  if (/\b(header|nav|navbar)\b/.test(hay)) return "Navbar";
  if (/\b(faq|accordion|question)/.test(hay)) return "FAQ";
  if (/\b(testimonial|proof|review|quote)/.test(hay)) return "Testimonials";
  if (/\b(pricing|plan|tier|booking|appointment)/.test(hay)) return "Pricing";
  if (/\b(cta|call-to-action|band)/.test(hay)) return "CTA";
  if (/\b(timeline|steps|process|journey)/.test(hay)) return "Timeline";
  if (/\b(form|contact|signup|subscribe)/.test(hay)) return "Form";
  if (/\b(service|feature|card|grid|benefit)/.test(hay)) return "Cards";
  return "Other";
}

function titleFor(section: { tag: string; id?: string | null; className?: string | null }, category: string) {
  const source = section.id ?? section.className?.split(/\s+/)[0] ?? section.tag;
  const words = source.replace(/[-_]+/g, " ").trim();
  if (!words || words === section.tag) return category;
  return words.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** All the document's stylesheet text, which a lifted section needs to render. */
export function extractStyles(document: string): string {
  return [...document.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n\n");
}

/** The Google Fonts (or other) stylesheet links the document depends on. */
export function extractFontLinks(document: string): string {
  return [...document.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].map((m) => m[0]).join("\n");
}

/**
 * Sections worth offering as components: the page's top-level regions plus the
 * children of <main>, which is where a generated site puts its real content.
 */
export function extractSections(document: string): ExtractedSection[] {
  const body = document.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? document;

  const collected = topLevelChildren(body).flatMap((child) => {
    if (child.tag === "script" || child.tag === "style") return [];
    if (SKIP_CLASSES.some((c) => child.className?.includes(c))) return [];
    // <main> is a wrapper — its children are the interesting parts.
    if (child.tag === "main") return topLevelChildren(child.html.replace(/^<main[^>]*>|<\/main>$/gi, ""));
    return [child];
  });

  return collected
    .filter((section) => section.html.trim().length > 120) // ignore trivial wrappers
    .map((section) => {
      const category = guessCategory(section);
      return { ...section, category, name: titleFor(section, category) };
    });
}

/** Wraps a section back into a standalone document so it renders in an iframe. */
export function buildPreviewDocument(input: { html: string; css: string; fontLinks?: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${input.fontLinks ?? ""}
<style>${input.css}</style>
</head>
<body>
${input.html}
</body>
</html>`;
}
