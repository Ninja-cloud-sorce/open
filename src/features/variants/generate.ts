import { readFile } from "node:fs/promises";
import path from "node:path";
import { Type } from "@google/genai";
import { db } from "@/lib/db";
import { humanizeAiError } from "@/lib/ai-errors";
import { callLLM } from "@/lib/llm";
import { normalizeHtmlDocument } from "@/lib/html";
import type { DesignLane } from "@/generated/prisma/enums";


/** Statically scoped so bundler file-tracing stays confined to this subfolder. */
const SKILLS_DIR = path.join(process.cwd(), ".agents", "skills");

const SKILL_FILES: Record<DesignLane, string[]> = {
  IMPECCABLE: ["impeccable/reference/craft-floor.md", "impeccable/reference/new-work.md"],
  TASTE_SKILL: ["design-taste-frontend/SKILL.md"],
};

const LANE_LABEL: Record<DesignLane, string> = {
  IMPECCABLE: "Impeccable",
  TASTE_SKILL: "Taste-Skill V2",
};

/** Cap per lane so the rulebooks inform the prompt without dominating the context window. */
const RULES_CHAR_BUDGET = 14000;

const rulesCache = new Map<DesignLane, string>();

/** Loads the real skill rulebooks shipped in this repo, so each lane generates
 *  under genuinely different design guidance rather than invented pseudo-rules. */
async function loadLaneRules(lane: DesignLane): Promise<string> {
  const cached = rulesCache.get(lane);
  if (cached) return cached;

  const parts: string[] = [];
  for (const relative of SKILL_FILES[lane]) {
    try {
      const contents = await readFile(path.join(SKILLS_DIR, relative), "utf8");
      parts.push(contents);
    } catch {
      // A missing skill file degrades guidance but must not break generation.
    }
  }

  const joined = parts.join("\n\n---\n\n").slice(0, RULES_CHAR_BUDGET);
  rulesCache.set(lane, joined);
  return joined;
}

export interface ProjectContext {
  name: string;
  serviceType: string | null;
  description: string | null;
  audience: string | null;
  designNotes: string | null;
  references: { title: string | null; analysisSummary: string | null }[];
}

function projectBrief(project: ProjectContext) {
  const lines = [
    `Project: ${project.name}`,
    project.serviceType && `Service type: ${project.serviceType}`,
    project.description && `What it does: ${project.description}`,
    project.audience && `Audience: ${project.audience}`,
    project.designNotes && `Design direction the user wants: ${project.designNotes}`,
  ].filter(Boolean);

  const refs = project.references
    .map((r) => [r.title, r.analysisSummary].filter(Boolean).join(" — "))
    .filter(Boolean);
  if (refs.length) lines.push(`Inspiration references:\n${refs.map((r) => `- ${r}`).join("\n")}`);

  return lines.join("\n");
}

const TOKENS_SHAPE = `"designTokens" is a JSON string with this exact shape:
{"fontDisplay":"<google font family>","fontBody":"<google font family>","fontMono":"<google font family or empty>","scaleRatio":"<e.g. 1.25>","colorBg":"#hex","colorSurface":"#hex","colorText":"#hex","colorMuted":"#hex","colorAccent":"#hex","colorAccentText":"#hex","radius":"<e.g. 0px | 8px | 999px>","spacingUnit":"<e.g. 8px>","borderStyle":"<e.g. 1px hairline | none | 2px solid>","motion":"<e.g. restrained fades | kinetic reveals | none>","texture":"<e.g. none | paper grain | dot grid>"}`;

const SPEC_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      styleName: { type: Type.STRING },
      rationale: { type: Type.STRING },
      designTokens: { type: Type.STRING },
    },
    required: ["styleName", "rationale", "designTokens"],
  },
};

interface SpecItem {
  styleName: string;
  rationale: string;
  designTokens: string;
}

/** Runs tasks with bounded concurrency. Ten simultaneous generations exhaust a
 *  free-tier minute instantly; a small pool keeps the round inside quota. */
async function mapWithConcurrency<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await task(items[index]);
    }
  });
  await Promise.all(workers);
}

/** Stage A — five distinct design systems for one lane. Cheap, text-only. */
async function generateLaneSpecs(
  lane: DesignLane,
  project: ProjectContext,
  parentTokens?: string | null,
  parentStyle?: string | null
): Promise<SpecItem[]> {
  const rules = await loadLaneRules(lane);

  const refining = parentTokens
    ? `\n\nThis is a REFINEMENT round. The user picked the direction "${parentStyle}" with these locked tokens:\n${parentTokens}\n\nAll 5 new options must keep that same visual identity — same font families, same palette, same overall voice. Vary only composition, hierarchy, density, and structural treatment. Do NOT introduce new fonts or new hues.`
    : `\n\nThese 5 must be genuinely different from each other — different type pairings, different palettes, different structural personalities. Not 5 shades of one idea.`;

  const text = await callLLM({
    contents: `You are a design director working under the following rulebook. Follow it closely — it is the house style you are accountable to.

=== RULEBOOK: ${LANE_LABEL[lane]} ===
${rules}
=== END RULEBOOK ===

Brief:
${projectBrief(project)}${refining}

Produce exactly 5 design directions. For each: a short "styleName" (1-3 words), a one-sentence "rationale" tying it to the brief, and "designTokens".

${TOKENS_SHAPE}`,
    config: { responseMimeType: "application/json", responseSchema: SPEC_SCHEMA },
    length: "short",
  });

  return parseSpecList(text).slice(0, 5);
}

/**
 * Providers disagree on JSON array shape: Gemini's responseSchema returns a bare
 * array, while OpenAI-compatible `json_object` mode is required to return an
 * object, so those providers wrap it (`{"directions": [...]}`). Accept either.
 */
function parseSpecList(text: string): SpecItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text || "[]");
  } catch {
    return [];
  }

  if (Array.isArray(parsed)) return parsed as SpecItem[];

  if (parsed && typeof parsed === "object") {
    const firstArray = Object.values(parsed as Record<string, unknown>).find(Array.isArray);
    if (firstArray) return firstArray as SpecItem[];
  }

  return [];
}

const SITE_RULES = `Output a COMPLETE self-contained HTML document starting with <!DOCTYPE html>.
- All CSS in one <style> tag in <head>. No external CSS frameworks.
- Load fonts via a single Google Fonts <link>.
- Bind every color, font, and radius to the supplied design tokens as CSS custom properties on :root, then use var() everywhere. This is what keeps the site visually consistent.
- Real, specific copy for this business — never lorem ipsum, never "Your Company".
- No placeholder image services and no <img> to external hosts; use CSS gradients, shapes, or typography for visual interest.
- Semantic HTML, responsive down to 375px, accessible contrast.`;

/** Stage B (preview) — one representative screen per variant. */
async function generatePreview(lane: DesignLane, project: ProjectContext, spec: SpecItem): Promise<string> {
  const rules = await loadLaneRules(lane);
  const text = await callLLM({
    contents: `You are a design director working under this rulebook:

=== RULEBOOK: ${LANE_LABEL[lane]} ===
${rules}
=== END RULEBOOK ===

Brief:
${projectBrief(project)}

Design direction: "${spec.styleName}" — ${spec.rationale}
Design tokens (bind these exactly):
${spec.designTokens}

Build the landing page's opening screen: header/nav, hero (headline, supporting line, primary CTA), and one supporting band beneath it. This is a preview used to judge the direction, so make the visual identity unmistakable.

${SITE_RULES}`,
  });
  return normalizeHtmlDocument(text);
}

const SECTIONS = [
  "sticky header with nav and a primary CTA",
  "hero with headline, supporting paragraph, and two CTAs",
  "services or features section (3-6 items, laid out per the design direction)",
  "a proof section appropriate to this business (testimonials, credentials, stats, or case highlights)",
  "pricing or engagement/booking section if it fits the business, otherwise a detailed 'how it works' section",
  "FAQ section (4-6 questions)",
  "closing CTA band",
  "footer with navigation columns, contact details, and legal line",
];

/** Stage B (full) — the entire multi-section site against locked tokens. */
export async function expandToFullSite(variantId: string) {
  const variant = await db.variant.findUniqueOrThrow({
    where: { id: variantId },
    include: { round: { include: { project: { include: { references: { include: { analysis: true } } } } } } },
  });

  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    await db.variant.update({
      where: { id: variantId },
      data: { status: "ERROR", error: "No LLM key configured. Set GEMINI_API_KEY or GROQ_API_KEY in .env." },
    });
    return;
  }

  await db.variant.update({ where: { id: variantId }, data: { status: "GENERATING", error: null } });

  try {
    const project = toContext(variant.round.project);
    const rules = await loadLaneRules(variant.lane);

    const draftText = await callLLM({
      contents: `You are a design director working under this rulebook:

=== RULEBOOK: ${LANE_LABEL[variant.lane]} ===
${rules}
=== END RULEBOOK ===

Brief:
${projectBrief(project)}

Design direction: "${variant.styleName}" — ${variant.rationale ?? ""}
Design tokens (bind these exactly — every section must share them):
${variant.designTokens}

Build the COMPLETE marketing site as one long page containing all of these sections in order:
${SECTIONS.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Every section must feel like part of the same designed system: consistent type scale, spacing rhythm, and color roles throughout. Vary section layouts so the page has rhythm — do not stack eight identical centered blocks.

${SITE_RULES}`,
    });

    const html = normalizeHtmlDocument(draftText);

    // Self-critique pass — a real quality lever, but it re-emits the whole
    // document, so it can truncate where the draft did not. Never let a failed
    // revision cost us a good draft.
    let finalHtml = html;
    try {
      const revisedText = await callLLM({
        contents: `Review this generated site against the rulebook below and return an IMPROVED version.

=== RULEBOOK: ${LANE_LABEL[variant.lane]} ===
${rules}
=== END RULEBOOK ===

Check specifically: typographic hierarchy and scale, spacing rhythm, section layout variety, copy quality (no filler, no AI cliché), color usage against the locked tokens, responsive behavior, and contrast/accessibility.

Return ONLY the corrected complete HTML document — no commentary.

${html}`,
      });
      finalHtml = normalizeHtmlDocument(revisedText);
    } catch {
      // Keep the draft; it already passed the renderable check.
    }

    await db.variant.update({
      where: { id: variantId },
      data: { status: "DONE", error: null, fullSiteHtml: finalHtml },
    });
  } catch (error) {
    await db.variant.update({
      where: { id: variantId },
      data: { status: "ERROR", error: humanizeAiError(error) },
    });
  }
}

/** Generates every variant in a round: both lanes' specs, then previews. */
export async function generateRound(roundId: string) {
  const round = await db.variantRound.findUniqueOrThrow({
    where: { id: roundId },
    include: {
      project: { include: { references: { include: { analysis: true } } } },
      parentVariant: true,
    },
  });

  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    await db.variant.updateMany({
      where: { roundId },
      data: { status: "ERROR", error: "No LLM key configured. Set GEMINI_API_KEY or GROQ_API_KEY in .env." },
    });
    return;
  }

  const project = toContext(round.project);
  const parent = round.parentVariant;

  // A refinement round stays in the lane the picked variant came from.
  const lanes: DesignLane[] = parent ? [parent.lane] : ["IMPECCABLE", "TASTE_SKILL"];

  await db.variant.updateMany({ where: { roundId }, data: { status: "GENERATING", error: null } });

  // Lanes run sequentially, and previews within a lane run in a small pool —
  // both to stay inside the free tier's per-minute request quota.
  for (const lane of lanes) {
    await (async () => {
      const variants = await db.variant.findMany({
        where: { roundId, lane },
        orderBy: { order: "asc" },
      });

      let specs: SpecItem[] = [];
      try {
        specs = await generateLaneSpecs(lane, project, parent?.designTokens, parent?.styleName);
      } catch (error) {
        await db.variant.updateMany({
          where: { roundId, lane },
          data: { status: "ERROR", error: humanizeAiError(error) },
        });
        return;
      }

      await mapWithConcurrency(
        variants.map((variant, index) => ({ variant, index })),
        2,
        async ({ variant, index }) => {
          const spec = specs[index];
          if (!spec) {
            await db.variant.update({
              where: { id: variant.id },
              data: { status: "ERROR", error: "Model returned no direction at this position." },
            });
            return;
          }

          await db.variant.update({
            where: { id: variant.id },
            data: { styleName: spec.styleName, rationale: spec.rationale, designTokens: spec.designTokens },
          });

          try {
            const previewHtml = await generatePreview(lane, project, spec);
            await db.variant.update({
              where: { id: variant.id },
              data: { status: "DONE", error: null, previewHtml },
            });
          } catch (error) {
            await db.variant.update({
              where: { id: variant.id },
              data: { status: "ERROR", error: humanizeAiError(error) },
            });
          }
        }
      );
    })();
  }
}

/** Suggests a starting subject line for hero image generation from project context. */
export async function suggestHeroSubject(project: ProjectContext): Promise<string> {
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) return "";
  try {
    const text = await callLLM({
      contents: `In one short sentence, describe the ideal hero photograph for this business. Subject and mood only, no camera jargon.\n\n${projectBrief(project)}`,
      length: "short",
      maxRounds: 1,
    });
    return text.trim();
  } catch {
    return "";
  }
}

function toContext(project: {
  name: string;
  serviceType: string | null;
  description: string | null;
  audience: string | null;
  designNotes: string | null;
  references: { title: string | null; analysis: { primaryStyle: string | null; aiNotes: string | null } | null }[];
}): ProjectContext {
  return {
    name: project.name,
    serviceType: project.serviceType,
    description: project.description,
    audience: project.audience,
    designNotes: project.designNotes,
    references: project.references.map((r) => ({
      title: r.title,
      analysisSummary: [r.analysis?.primaryStyle, r.analysis?.aiNotes].filter(Boolean).join(": ") || null,
    })),
  };
}
