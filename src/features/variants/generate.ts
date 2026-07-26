import { GoogleGenAI, Type } from "@google/genai";
import { db } from "@/lib/db";
import type { PromptBriefFields } from "@/features/prompts/types";

const MODEL = "gemini-2.5-flash";

export const DIRECTIONS: { key: string; name: string; guidance: string }[] = [
  {
    key: "print-tech",
    name: "Print-Tech",
    guidance:
      "Technical print aesthetic: light paper background, sharp square corners, uppercase mono labels with wide tracking, a faint crosshair grid, a single bold registration-red or safety-orange accent, spec-sheet style meta lines with pipe separators.",
  },
  {
    key: "data-texture",
    name: "Data Texture",
    guidance:
      "Dark navy/graphite background, technical and dense, mono headline font, an electric-blue or amber accent, a data/grid texture motif in the background, bracket-style meta labels like [ 01 ].",
  },
  {
    key: "vast-quiet",
    name: "Vast Quiet",
    guidance:
      "Extremely minimal: near-white background, huge generous whitespace, thin-weight large sans headline, one quiet restrained CTA, no decorative clutter, no visible grid or texture.",
  },
  {
    key: "dither-mono",
    name: "Dither Mono",
    guidance:
      "Near-black background, warm single accent color (orange or amber), a subtle dither/halftone dot texture, serif italic used only for one emphasized word inside an otherwise sans headline, editorial tone.",
  },
  {
    key: "classical-remix",
    name: "Classical Remix",
    guidance:
      "Cream/paper background, real serif display typography, centered symmetric composition, thin ornamental rules above and below the headline, small-caps eyebrow label, editorial/heritage tone.",
  },
];

const VARIANT_ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    label: { type: Type.STRING },
    styleName: { type: Type.STRING },
    html: { type: Type.STRING },
  },
  required: ["label", "styleName", "html"],
};

const HTML_INSTRUCTIONS = `Each "html" value must be a COMPLETE, self-contained HTML document (starting with <!DOCTYPE html>) with all CSS inline in a single <style> tag in <head>. No external stylesheets, no build tooling, no JS frameworks. Scope the page to a single hero section only: a small nav row (wordmark + one CTA), a headline, one line of supporting copy, a primary CTA (and optionally a secondary link), matching the brief. Do not build a full multi-section marketing page. Use only system font stacks or Google Fonts <link> tags (no npm packages). The page must look genuinely different from the other directions in this batch — vary layout, palette, and type per its named style.`;

function briefToText(brief: {
  outputPrompt: string | null;
  aesthetic: string | null;
  intent: string | null;
  audience: string | null;
  constraints: string | null;
  guardRails: string | null;
  negativePrompt: string | null;
  componentStyle: string | null;
  motionStyle: string | null;
  typographyStyle: string | null;
}) {
  if (brief.outputPrompt?.trim()) return brief.outputPrompt;
  const fields: [string, PromptBriefFields[keyof PromptBriefFields]][] = [
    ["Aesthetic", brief.aesthetic],
    ["Intent", brief.intent],
    ["Audience", brief.audience],
    ["Constraints", brief.constraints],
    ["Guard Rails", brief.guardRails],
    ["Negative Prompt", brief.negativePrompt],
    ["Component Style", brief.componentStyle],
    ["Motion Style", brief.motionStyle],
    ["Typography Style", brief.typographyStyle],
  ];
  return fields
    .filter(([, value]) => value?.trim())
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

/** Generates all 5 top-level direction variants for a set in one batched Gemini call. */
export async function generateDirections(variantSetId: string) {
  const variants = await db.variant.findMany({ where: { variantSetId, kind: "DIRECTION" }, orderBy: { order: "asc" } });
  const variantSet = await db.variantSet.findUniqueOrThrow({ where: { id: variantSetId }, include: { brief: true } });

  if (!process.env.GEMINI_API_KEY) {
    await db.variant.updateMany({
      where: { variantSetId, kind: "DIRECTION" },
      data: { status: "ERROR", error: "GEMINI_API_KEY is not set. Add it to .env to generate variants." },
    });
    return;
  }

  await db.variant.updateMany({ where: { variantSetId, kind: "DIRECTION" }, data: { status: "GENERATING" } });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const briefText = briefToText(variantSet.brief);

    const prompt = `You are a senior design director producing 5 genuinely distinct landing-page hero directions for one brief.

Brief:
${briefText || "(no brief details provided — use good generic SaaS landing page judgment)"}

Produce exactly 5 variants, one per named direction below, in this exact order:
${DIRECTIONS.map((d, i) => `${i + 1}. "${d.name}" — ${d.guidance}`).join("\n")}

For each, set "label" to "V${1}".."V5" matching its position, "styleName" to the direction's name, and "html" to the generated page.

${HTML_INSTRUCTIONS}`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: VARIANT_ITEM_SCHEMA },
      },
    });

    const results: { label: string; styleName: string; html: string }[] = JSON.parse(response.text ?? "[]");

    await Promise.all(
      variants.map((variant, index) => {
        const result = results[index];
        if (!result) {
          return db.variant.update({
            where: { id: variant.id },
            data: { status: "ERROR", error: "Model did not return a variant at this position." },
          });
        }
        return db.variant.update({
          where: { id: variant.id },
          data: {
            status: "DONE",
            error: null,
            label: result.label || variant.label,
            styleName: result.styleName || variant.styleName,
            html: result.html,
          },
        });
      })
    );
  } catch (error) {
    await db.variant.updateMany({
      where: { variantSetId, kind: "DIRECTION" },
      data: { status: "ERROR", error: error instanceof Error ? error.message : "Generation failed." },
    });
  }
}

/** Generates 3 layout refinements of one chosen direction in a single batched Gemini call. */
export async function generateRefinements(directionVariantId: string) {
  const parent = await db.variant.findUniqueOrThrow({
    where: { id: directionVariantId },
    include: { variantSet: { include: { brief: true } } },
  });

  const labels = ["A", "B", "C"].map((suffix) => `${parent.label}${suffix}`);
  const hasKey = Boolean(process.env.GEMINI_API_KEY);

  // Reuse existing refinement rows on retry rather than creating duplicates
  // alongside a previously-failed batch.
  const existing = await db.variant.findMany({ where: { parentId: parent.id }, orderBy: { order: "asc" } });

  const placeholders = await Promise.all(
    labels.map((label, index) => {
      const data = {
        status: hasKey ? ("GENERATING" as const) : ("ERROR" as const),
        error: hasKey ? null : "GEMINI_API_KEY is not set. Add it to .env to generate variants.",
      };
      return existing[index]
        ? db.variant.update({ where: { id: existing[index].id }, data })
        : db.variant.create({
            data: {
              variantSetId: parent.variantSetId,
              parentId: parent.id,
              kind: "REFINEMENT",
              label,
              styleName: "Refining…",
              order: index,
              ...data,
            },
          });
    })
  );

  if (!process.env.GEMINI_API_KEY) return placeholders;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const briefText = briefToText(parent.variantSet.brief);

    const prompt = `You are refining ONE chosen design direction for a landing-page hero. Do not redesign it — the visitor must recognize it as the same brand.

Brief:
${briefText || "(no brief details provided)"}

Locked identity — direction "${parent.styleName}":
${DIRECTIONS.find((d) => d.name === parent.styleName)?.guidance ?? parent.styleName}

Here is the current HTML for this direction, treat its palette, typography, and tone as fixed:
${parent.html ?? "(no existing HTML — invent one consistent with the locked identity above)"}

Produce exactly 3 refinements labeled "${labels[0]}", "${labels[1]}", "${labels[2]}", each varying a DIFFERENT layout axis (e.g. one changes hierarchy, one changes composition topology — stacked/split/asymmetric, one changes density) while preserving the exact same palette, type choices, and voice. "styleName" should be a short 1-3 word description of what changed (e.g. "Split layout", "Centered", "Denser").

${HTML_INSTRUCTIONS}`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: VARIANT_ITEM_SCHEMA },
      },
    });

    const results: { label: string; styleName: string; html: string }[] = JSON.parse(response.text ?? "[]");

    await Promise.all(
      placeholders.map((placeholder, index) => {
        const result = results[index];
        if (!result) {
          return db.variant.update({
            where: { id: placeholder.id },
            data: { status: "ERROR", error: "Model did not return a refinement at this position." },
          });
        }
        return db.variant.update({
          where: { id: placeholder.id },
          data: { status: "DONE", error: null, styleName: result.styleName || placeholder.label, html: result.html },
        });
      })
    );
  } catch (error) {
    await db.variant.updateMany({
      where: { id: { in: placeholders.map((p) => p.id) } },
      data: { status: "ERROR", error: error instanceof Error ? error.message : "Generation failed." },
    });
  }

  return db.variant.findMany({ where: { parentId: parent.id }, orderBy: { order: "asc" } });
}
