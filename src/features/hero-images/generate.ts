import { GoogleGenAI, Type } from "@google/genai";

const MODEL = "gemini-2.5-flash";
const PREVIEW_SIZE = { width: 1024, height: 640 };
const UPSCALE_SIZE = { width: 2048, height: 1280 };

export function buildPollinationsUrl(params: { prompt: string; seed: number; width?: number; height?: number }) {
  const { prompt, seed, width = PREVIEW_SIZE.width, height = PREVIEW_SIZE.height } = params;
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
}

export function buildUpscaledUrl(prompt: string, seed: number) {
  return buildPollinationsUrl({ prompt, seed, width: UPSCALE_SIZE.width, height: UPSCALE_SIZE.height });
}

export function randomSeed() {
  return Math.floor(Math.random() * 1_000_000);
}

const DEFAULT_ANGLES = [
  { conceptName: "Wide Vista", angle: "a wide establishing shot with generous negative space" },
  { conceptName: "Close Texture", angle: "a close-up macro shot emphasizing texture and material detail" },
  { conceptName: "Abstract Pattern", angle: "an abstract geometric pattern echoing the product's purpose" },
  { conceptName: "In Context", angle: "a candid, human, in-use moment related to the product" },
];

const DEFAULT_TREATMENTS = [
  { conceptName: "B&W Original", suffix: "black and white monochrome photography" },
  { conceptName: "Dawn Touch", suffix: "soft warm dawn light, gentle pink and gold tones" },
  { conceptName: "Golden Hour", suffix: "golden hour sunlight, warm amber glow" },
  { conceptName: "Alpenglow", suffix: "cool blue alpenglow twilight tones" },
  { conceptName: "Ochre Duotone", suffix: "ochre and ink duotone color grade" },
];

interface ConceptItem {
  conceptName: string;
  prompt: string;
}

interface TreatmentItem {
  conceptName: string;
  promptSuffix: string;
}

function briefSubjectLine(brief: { aesthetic: string | null; intent: string | null; audience: string | null }) {
  return [brief.aesthetic, brief.intent, brief.audience].filter(Boolean).join(", ") || "a modern software product";
}

export async function proposeBaseConcepts(brief: {
  aesthetic: string | null;
  intent: string | null;
  audience: string | null;
  industry?: string | null;
}): Promise<ConceptItem[]> {
  const subject = briefSubjectLine(brief);

  if (!process.env.GEMINI_API_KEY) {
    return DEFAULT_ANGLES.map((a) => ({
      conceptName: a.conceptName,
      prompt: `${subject}, ${a.angle}, professional photography, hero image`,
    }));
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Propose exactly 4 genuinely distinct hero-image photo concepts for this brief: ${subject}. Each is a short, vivid image-generation prompt (one sentence, concrete visual details, no text/logos/UI in the image). Return a short 1-2 word "conceptName" and the "prompt" for each.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { conceptName: { type: Type.STRING }, prompt: { type: Type.STRING } },
            required: ["conceptName", "prompt"],
          },
        },
      },
    });
    const items: ConceptItem[] = JSON.parse(response.text ?? "[]");
    if (items.length === 4) return items;
  } catch {
    // fall through to deterministic default below
  }

  return DEFAULT_ANGLES.map((a) => ({
    conceptName: a.conceptName,
    prompt: `${subject}, ${a.angle}, professional photography, hero image`,
  }));
}

export async function proposeTreatments(basePrompt: string): Promise<TreatmentItem[]> {
  if (!process.env.GEMINI_API_KEY) {
    return DEFAULT_TREATMENTS.map((t) => ({ conceptName: t.conceptName, promptSuffix: t.suffix }));
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Propose exactly 5 distinct color-grade / lighting treatments for this base image prompt: "${basePrompt}". Each "promptSuffix" is a short phrase to append (color/lighting only, do not change the subject or composition). "conceptName" is a short 1-3 word label.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { conceptName: { type: Type.STRING }, promptSuffix: { type: Type.STRING } },
            required: ["conceptName", "promptSuffix"],
          },
        },
      },
    });
    const items: TreatmentItem[] = JSON.parse(response.text ?? "[]");
    if (items.length === 5) return items;
  } catch {
    // fall through to deterministic default below
  }

  return DEFAULT_TREATMENTS.map((t) => ({ conceptName: t.conceptName, promptSuffix: t.suffix }));
}
