import { readFile } from "node:fs/promises";
import path from "node:path";
import { Type } from "@google/genai";
import { db } from "@/lib/db";
import { humanizeAiError } from "@/lib/ai-errors";
import { callLLM } from "@/lib/llm";
import { normalizeHtmlDocument } from "@/lib/html";
import { buildDiversityBrief, diversityPrompt } from "@/features/variants/diversity";
import { COLLECTIONS } from "@/features/variants/collections";
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
const RULES_CHAR_BUDGET = 40000;

/**
 * The Taste-Skill rulebook is ~87K characters and its most load-bearing sections
 * — the forbidden-pattern list and the bias corrections — sit near the end. A
 * plain head-slice dropped them entirely, which is exactly why output still read
 * as AI-generated. Hoist those sections ahead of the narrative material.
 */
const PRIORITY_HEADINGS = [
  /ai tells|forbidden pattern/i,
  /design engineering directive|bias correction/i,
  /layout discipline|content density/i,
  /brief inference|anti-default/i,
];

/** Splits on top-level `## ` headings and packs priority sections in first. */
function prioritizeSections(markdown: string, budget: number): string {
  const chunks = markdown.split(/\n(?=## )/);
  if (chunks.length < 2) return markdown.slice(0, budget);

  const rank = (chunk: string) => {
    const heading = chunk.slice(0, 120);
    const index = PRIORITY_HEADINGS.findIndex((pattern) => pattern.test(heading));
    return index === -1 ? PRIORITY_HEADINGS.length : index;
  };

  // Stable sort by rank keeps each tier in its authored order.
  const ordered = chunks
    .map((chunk, index) => ({ chunk, index, rank: rank(chunk) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);

  const kept: string[] = [];
  let used = 0;
  for (const { chunk } of ordered) {
    if (used + chunk.length > budget) continue;
    kept.push(chunk);
    used += chunk.length;
  }
  return kept.join("\n");
}

const rulesCache = new Map<DesignLane, string>();

/** Loads the real skill rulebooks shipped in this repo, so each lane generates
 *  under genuinely different design guidance rather than invented pseudo-rules. */
async function loadLaneRules(lane: DesignLane): Promise<string> {
  const cached = rulesCache.get(lane);
  if (cached) return cached;

  const files = SKILL_FILES[lane];
  const budgetPerFile = Math.floor(RULES_CHAR_BUDGET / files.length);

  const parts: string[] = [];
  for (const relative of files) {
    try {
      const contents = await readFile(path.join(SKILLS_DIR, relative), "utf8");
      parts.push(
        contents.length > budgetPerFile ? prioritizeSections(contents, budgetPerFile) : contents
      );
    } catch {
      // A missing skill file degrades guidance but must not break generation.
    }
  }

  const joined = parts.join("\n\n---\n\n");
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

/**
 * Stage A — this lane's interpretation of each of the five fixed design
 * languages. Order is load-bearing: index i is COLLECTIONS[i], which is how the
 * two lanes pair up in the split view.
 */
async function generateLaneSpecs(
  lane: DesignLane,
  project: ProjectContext,
  parentTokens?: string | null,
  parentStyle?: string | null
): Promise<SpecItem[]> {
  const rules = await loadLaneRules(lane);

  const refining = parentTokens
    ? `\n\nThis is a REFINEMENT round. The user picked "${parentStyle}" with these locked tokens:\n${parentTokens}\n\nKeep that visual identity - same font families, same palette, same voice - while still honouring each design language below. Vary composition, hierarchy, and density rather than hue and typeface.`
    : "";

  const collections = COLLECTIONS.map(
    (collection, index) => `${index + 1}. ${collection.name}\n${collection.brief}`
  ).join("\n\n");

  const text = await callLLM({
    contents: `You are a design director working under the following rulebook. Follow it closely - it is the house style you are accountable to.

=== RULEBOOK: ${LANE_LABEL[lane]} ===
${rules}
=== END RULEBOOK ===

Brief:
${projectBrief(project)}${refining}

Below are five fixed design languages. Produce YOUR rulebook's interpretation of each one, applied to this specific business.

=== DESIGN LANGUAGES ===
${collections}
=== END DESIGN LANGUAGES ===

Return exactly ${COLLECTIONS.length} items in that exact order. For each:
- "styleName": the design language's name, unchanged (${COLLECTIONS.map((c) => c.name).join(", ")}).
- "rationale": one sentence on how your rulebook reads this language for this business.
- "designTokens": tokens that genuinely express that language. Print-Tech and Vast Quiet must not end up with similar palettes or type.

Token constraints: never Inter, never pure #000000 or #FFFFFF for backgrounds, and no oversaturated accent.

${TOKENS_SHAPE}`,
    config: { responseMimeType: "application/json", responseSchema: SPEC_SCHEMA },
    length: "short",
  });

  const parsed = parseSpecList(text).slice(0, COLLECTIONS.length);

  // The collection name is ours, not the model's — the split view pairs on it,
  // so a hallucinated or reordered name would break the comparison.
  return COLLECTIONS.map((collection, index) => ({
    styleName: collection.name,
    rationale: parsed[index]?.rationale ?? collection.brief,
    designTokens: parsed[index]?.designTokens ?? "",
  })).filter((spec) => spec.designTokens);
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
- Real, specific copy for this business. Never lorem ipsum, never "Your Company".
- Where a photograph belongs, use https://picsum.photos/seed/<descriptive-slug>/<width>/<height> with a slug describing the shot. Give every image an explicit width/height and object-fit: cover.
- Semantic HTML, responsive down to 375px, accessible contrast.`;

/**
 * A compact ban list sitting directly beside the task. The lane rulebooks carry
 * the full reasoning, but rules buried in tens of thousands of characters of
 * context get followed less reliably than a short checklist at the point of use.
 */
const SLOP_BANS = `These are the signatures that make a page read as AI-generated. Treat them as hard bans:
- No row of three equal feature cards. Use an asymmetric grid, a two-column zig-zag, or an editorial list.
- No section-number eyebrows ("01 / INDEX", "002 - Capabilities"). Name the topic in plain language.
- No version or status eyebrows in the hero ("V2.0", "BETA", "EARLY ACCESS", "INVITE ONLY").
- No em-dash anywhere in the copy. Use a regular hyphen.
- The middle dot is rationed to at most one per line. Never use it as a general separator.
- No decorative status dots before nav links, badges, or list rows.
- No hairline or crosshair grid lines added purely as decoration.
- No fake product UI built out of divs (fake dashboard, terminal, task list, chat). This is the single biggest tell.
- No gradient text on headings, no neon glows, no pure #000000, no oversaturated accents.
- Do not use Inter. Do not lean on a huge H1 for hierarchy; use weight, color, and spacing.
- No filler verbs: elevate, seamless, unleash, next-gen, revolutionize, empower, unlock, transform, streamline.
- No generic person names (John Doe, Sarah Chen) and no fake-perfect figures (99.9%, 50%, 10,000+). Use specific, slightly irregular numbers.
- No startup-slop naming (Acme, Nexus, SmartFlow, Cloudly).
- No poetic section labels ("Field notes", "From the bench", "On our desks"). Plain functional labels.
- Vary the rhythm between sections: alternate background weight, alignment, and density. Never stack eight centered blocks.`;

/** Stage B (preview) — a complete site per variant, on an architecture unique to
 *  it. Previously this asked for only a hero plus one band against a fixed
 *  eight-section list, which is why every direction came out the same shape. */
async function generatePreview(
  lane: DesignLane,
  project: ProjectContext,
  spec: SpecItem,
  roundSeed: string,
  variantIndex: number
): Promise<string> {
  const rules = await loadLaneRules(lane);
  const architecture = diversityPrompt(buildDiversityBrief(roundSeed, variantIndex));
  const collection = COLLECTIONS.find((c) => c.name === spec.styleName);

  const text = await callLLM({
    contents: `You are a design director working under this rulebook:

=== RULEBOOK: ${LANE_LABEL[lane]} ===
${rules}
=== END RULEBOOK ===

Brief:
${projectBrief(project)}

Design language: "${spec.styleName}"
${collection ? `${collection.brief}\n` : ""}Your reading of it: ${spec.rationale}
Design tokens (bind these exactly, every section shares them):
${spec.designTokens}

${architecture}

Build the COMPLETE site as one long page. Every section must read as part of one designed system: the same type scale, spacing rhythm, and color roles throughout. This page is judged against nine others, so its visual identity has to be unmistakable and specific to this direction.

${SITE_RULES}

${SLOP_BANS}`,
  });
  return normalizeHtmlDocument(text);
}

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

${diversityPrompt(buildDiversityBrief(variant.id))}

Build the COMPLETE site as one long page. Every section must feel like part of the same designed system: consistent type scale, spacing rhythm, and color roles throughout.

${SITE_RULES}

${SLOP_BANS}`,
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

Audit it against this ban list and fix every violation you find:

${SLOP_BANS}

Then check: typographic hierarchy and scale, spacing rhythm, section layout variety, copy specificity, color usage against the locked tokens, responsive behavior, and contrast.

Keep every section that is already there. Return ONLY the corrected complete HTML document, no commentary.

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

  // Both lanes on every round, refinement included, so each design language
  // always has an Impeccable version on the left and a Taste-Skill one right.
  const lanes: DesignLane[] = ["IMPECCABLE", "TASTE_SKILL"];

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
            const previewHtml = await generatePreview(
              lane,
              project,
              spec,
              roundId,
              variantSlot(lane, variant.order)
            );
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
