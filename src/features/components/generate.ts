import { callLLM } from "@/lib/llm";
import { normalizeHtmlFragment, assertNoLeakedCss } from "@/lib/html";
import type { ComponentCategory } from "@/features/components/extract";

const CATEGORY_BRIEF: Record<string, string> = {
  Hero: "a hero section with an eyebrow, headline, supporting line, and a primary plus secondary CTA",
  Navbar: "a header/navigation bar with a wordmark, nav links, and one primary CTA",
  Cards: "a feature or services grid of 3-6 cards, laid out with rhythm rather than identical tiles",
  Testimonials: "a testimonials section with 2-3 quotes, each attributed to a name and role",
  Pricing: "a pricing section with 2-3 tiers, feature lists, and one highlighted plan",
  CTA: "a closing call-to-action band with a headline and a primary action",
  FAQ: "an FAQ section with 4-6 questions using native <details>/<summary> disclosure",
  Footer: "a footer with navigation columns, contact details, and a legal line",
  Timeline: "a timeline or numbered process with 3-5 steps",
  Buttons: "a small set of button styles — primary, secondary, ghost — shown together",
  Form: "a form with labelled fields, helper text, and a submit action",
  Other: "a self-contained page section",
};

export interface GeneratedComponent {
  html: string;
  css: string;
  fontLinks: string;
}

/**
 * Generates one component. Uses `length: "short"` deliberately: a component is
 * a few thousand characters, well inside Groq's ceiling, unlike a full page —
 * which is the case that truncates into a blank document.
 */
export async function generateComponent(input: {
  category: ComponentCategory;
  styleNotes?: string;
  tokens?: string | null;
}): Promise<GeneratedComponent> {
  const brief = CATEGORY_BRIEF[input.category] ?? CATEGORY_BRIEF.Other;

  const tokenBlock = input.tokens
    ? `Bind these design tokens exactly, as CSS custom properties on :root, then use var() throughout:\n${input.tokens}`
    : `Choose a coherent small token set (one display font, one body font, a background, a text colour, one accent) and expose it on :root as custom properties, then use var() throughout.`;

  const text = await callLLM({
    contents: `You are a senior design engineer. Build ${brief}.

${input.styleNotes ? `Style direction: ${input.styleNotes}\n` : ""}
${tokenBlock}

Return exactly two blocks, in this order and nothing else:

<style>
/* all CSS for this component */
</style>
<!-- markup -->
<section> ... </section>

Rules:
- Real, specific copy. Never lorem ipsum, never "Your Company".
- One top-level element for the markup (a <section>, <header>, <footer>, or <nav>).
- No external CSS frameworks. Google Fonts via a <link> line before the <style> block if you need one.
- No <img> to external hosts; use CSS or inline SVG.
- Semantic HTML, responsive to 375px, accessible contrast.`,
    length: "short",
  });

  return splitComponentResponse(text);
}

/** Separates the style block, font links, and markup from one response. */
export function splitComponentResponse(text: string): GeneratedComponent {
  let body = text.trim();

  const fenced = body.match(/```(?:html)?\s*\n([\s\S]*?)```/);
  if (fenced) body = fenced[1].trim();

  const fontLinks = [...body.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].map((m) => m[0]).join("\n");
  const css = [...body.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n\n").trim();

  // Whatever remains once styles, links, and comments are removed is the markup.
  const markup = body
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  const html = normalizeHtmlFragment(markup);
  if (!css) throw new Error("Model returned markup without any styles — try again.");
  assertNoLeakedCss(html);

  return { html, css, fontLinks };
}
