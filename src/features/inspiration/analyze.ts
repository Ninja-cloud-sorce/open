import { GoogleGenAI, createUserContent, createPartFromBase64, Type } from "@google/genai";
import { db } from "@/lib/db";
import { humanizeAiError } from "@/lib/ai-errors";

const ANALYSIS_MODEL = "gemini-flash-latest";
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

interface ColorSwatch {
  name: string;
  hex: string;
  percentage: number;
}

interface AnalysisResult {
  title: string;
  description: string;
  primaryStyle: string;
  secondaryStyles: string[];
  confidence: number;
  visualTone: string;
  designLanguage: string;
  mood: string[];
  industry: string;
  layoutStyle: string;
  gridSystem: string;
  spacingDensity: string;
  visualHierarchy: string;
  typography: { headline: string; body: string; weight: string; style: string };
  colorPalette: ColorSwatch[];
  illustrationStyle: string;
  iconStyle: string;
  textures: string;
  lighting: string;
  depth: string;
  animationStyle: string;
  components: string[];
  keywords: string[];
  recommendedTags: string[];
  designScore: {
    minimalism: number;
    premium: number;
    creativity: number;
    technical: number;
    storytelling: number;
    visualDensity: number;
    accessibility: number;
    consistency: number;
  };
  aiNotes: string;
}

const STRING_ARRAY = { type: Type.ARRAY, items: { type: Type.STRING } };
const SCORE = { type: Type.NUMBER };

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    primaryStyle: { type: Type.STRING },
    secondaryStyles: STRING_ARRAY,
    confidence: SCORE,
    visualTone: { type: Type.STRING },
    designLanguage: { type: Type.STRING },
    mood: STRING_ARRAY,
    industry: { type: Type.STRING },
    layoutStyle: { type: Type.STRING },
    gridSystem: { type: Type.STRING },
    spacingDensity: { type: Type.STRING },
    visualHierarchy: { type: Type.STRING },
    typography: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING },
        body: { type: Type.STRING },
        weight: { type: Type.STRING },
        style: { type: Type.STRING },
      },
      required: ["headline", "body", "weight", "style"],
    },
    colorPalette: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          hex: { type: Type.STRING },
          percentage: SCORE,
        },
        required: ["name", "hex", "percentage"],
      },
    },
    illustrationStyle: { type: Type.STRING },
    iconStyle: { type: Type.STRING },
    textures: { type: Type.STRING },
    lighting: { type: Type.STRING },
    depth: { type: Type.STRING },
    animationStyle: { type: Type.STRING },
    components: STRING_ARRAY,
    keywords: STRING_ARRAY,
    recommendedTags: STRING_ARRAY,
    designScore: {
      type: Type.OBJECT,
      properties: {
        minimalism: SCORE,
        premium: SCORE,
        creativity: SCORE,
        technical: SCORE,
        storytelling: SCORE,
        visualDensity: SCORE,
        accessibility: SCORE,
        consistency: SCORE,
      },
      required: [
        "minimalism",
        "premium",
        "creativity",
        "technical",
        "storytelling",
        "visualDensity",
        "accessibility",
        "consistency",
      ],
    },
    aiNotes: { type: Type.STRING },
  },
  required: [
    "title",
    "description",
    "primaryStyle",
    "secondaryStyles",
    "confidence",
    "mood",
    "layoutStyle",
    "typography",
    "colorPalette",
    "components",
    "keywords",
    "recommendedTags",
    "designScore",
    "aiNotes",
  ],
};

const PRIMARY_CATEGORIES = [
  "Modern",
  "Classic",
  "Print",
  "Tech Paper",
  "Detailed Menu",
  "Vast",
  "Quiet",
  "Cinematic",
  "Detached Textures",
  "Classical Remakes",
  "Glitch",
  "Antiquity",
  "Illustrated",
  "Storybook",
  "Reference Styles",
];

const ANALYSIS_PROMPT = `You are a senior UI/UX designer with expertise in visual systems, branding, typography, interface design, motion design, editorial layouts, and product design.

Analyze the attached image and return structured design metadata.

For "primaryStyle", prefer one of these labels when it genuinely fits (don't force it if none do): ${PRIMARY_CATEGORIES.join(", ")}.
Generate 15-30 semantic "recommendedTags" (not limited to a fixed vocabulary).
"aiNotes" is a short professional design-review paragraph (2-4 sentences).
All design score fields are 0-100 integers.`;

async function readLocalUpload(relativeUrl: string) {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const absolute = path.join(process.cwd(), "public", relativeUrl);
  return readFile(absolute);
}

function guessMimeType(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

async function runVisionAnalysis(ai: GoogleGenAI, base64: string, mimeType: string): Promise<AnalysisResult> {
  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: createUserContent([ANALYSIS_PROMPT, createPartFromBase64(base64, mimeType)]),
    config: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
  });
  return JSON.parse(response.text ?? "{}");
}

async function embedSummary(ai: GoogleGenAI, result: AnalysisResult): Promise<number[]> {
  const summary = [
    result.title,
    result.description,
    result.primaryStyle,
    result.secondaryStyles?.join(", "),
    result.mood?.join(", "),
    result.industry,
    result.keywords?.join(", "),
    result.aiNotes,
  ]
    .filter(Boolean)
    .join(". ");

  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [summary],
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  return response.embeddings?.[0]?.values ?? [];
}

/** Analyzes an inspiration item in place. Never throws — failures are recorded on the analysis row. */
export async function analyzeInspirationItem(itemId: string) {
  const item = await db.inspirationItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  const imagePath = item.type === "VIDEO" ? item.posterUrl : item.fileUrl;

  if (!process.env.GEMINI_API_KEY || !imagePath) {
    await db.inspirationAnalysis.upsert({
      where: { itemId },
      create: { itemId, status: "SKIPPED" },
      update: { status: "SKIPPED" },
    });
    return;
  }

  await db.inspirationAnalysis.upsert({
    where: { itemId },
    create: { itemId, status: "ANALYZING" },
    update: { status: "ANALYZING" },
  });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const buffer = await readLocalUpload(imagePath);
    const mimeType = guessMimeType(imagePath);

    const result = await runVisionAnalysis(ai, buffer.toString("base64"), mimeType);
    const embedding = await embedSummary(ai, result).catch(() => []);

    const collections = await db.collection.findMany({ select: { id: true, name: true } });
    const matchedCollection =
      collections.find((c) => c.name.toLowerCase() === result.primaryStyle?.toLowerCase()) ??
      (await db.collection.findUnique({ where: { name: "Uncategorized" } }));

    const tagNames = Array.from(
      new Set([...(result.recommendedTags ?? []), ...(result.keywords ?? [])].map((t) => t.toLowerCase().trim()))
    ).filter(Boolean);

    await db.inspirationAnalysis.update({
      where: { itemId },
      data: {
        status: "DONE",
        error: null,
        title: result.title,
        description: result.description,
        primaryStyle: result.primaryStyle,
        secondaryStyles: JSON.stringify(result.secondaryStyles ?? []),
        confidence: result.confidence ?? null,
        visualTone: result.visualTone,
        designLanguage: result.designLanguage,
        mood: JSON.stringify(result.mood ?? []),
        industry: result.industry,
        layoutStyle: result.layoutStyle,
        gridSystem: result.gridSystem,
        spacingDensity: result.spacingDensity,
        visualHierarchy: result.visualHierarchy,
        typographyHeadline: result.typography?.headline,
        typographyBody: result.typography?.body,
        typographyWeight: result.typography?.weight,
        typographyStyle: result.typography?.style,
        colorPalette: JSON.stringify(result.colorPalette ?? []),
        illustrationStyle: result.illustrationStyle,
        iconStyle: result.iconStyle,
        textures: result.textures,
        lighting: result.lighting,
        depth: result.depth,
        animationStyle: result.animationStyle,
        components: JSON.stringify(result.components ?? []),
        keywords: JSON.stringify(result.keywords ?? []),
        recommendedTags: JSON.stringify(result.recommendedTags ?? []),
        scoreMinimalism: result.designScore?.minimalism ?? null,
        scorePremium: result.designScore?.premium ?? null,
        scoreCreativity: result.designScore?.creativity ?? null,
        scoreTechnical: result.designScore?.technical ?? null,
        scoreStorytelling: result.designScore?.storytelling ?? null,
        scoreVisualDensity: result.designScore?.visualDensity ?? null,
        scoreAccessibility: result.designScore?.accessibility ?? null,
        scoreConsistency: result.designScore?.consistency ?? null,
        aiNotes: result.aiNotes,
        embedding: embedding.length ? JSON.stringify(embedding) : null,
      },
    });

    await db.inspirationItem.update({
      where: { id: itemId },
      data: {
        collectionId: matchedCollection?.id,
        tags: {
          connectOrCreate: tagNames.map((name) => ({ where: { name }, create: { name } })),
        },
      },
    });
  } catch (error) {
    await db.inspirationAnalysis.update({
      where: { itemId },
      data: {
        status: "ERROR",
        error: humanizeAiError(error),
      },
    });
  }
}

/** Embeds arbitrary query text using the same model/dimensionality as item analysis, for semantic search. */
export async function embedQueryText(query: string): Promise<number[] | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models
    .embedContent({
      model: EMBEDDING_MODEL,
      contents: [query],
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    })
    .catch(() => null);
  return response?.embeddings?.[0]?.values ?? null;
}
