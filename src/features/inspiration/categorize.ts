import { GoogleGenAI, createUserContent, createPartFromBase64, Type } from "@google/genai";
import { db } from "@/lib/db";

interface CategorizeResult {
  collectionName: string;
  tags: string[];
  description: string;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    collection: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    description: { type: Type.STRING },
  },
  required: ["collection", "tags", "description"],
};

async function askGemini(base64: string, mimeType: string, collectionNames: string[]): Promise<CategorizeResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const prompt = `You are categorizing a design inspiration image for a design tool.
Pick exactly one collection from this fixed list (return it verbatim): ${collectionNames.join(", ")}.
Also suggest 3-6 short lowercase tags describing the design (e.g. "dark mode", "serif type", "grid layout").
Write one plain sentence describing what's distinctive about the design.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([prompt, createPartFromBase64(base64, mimeType)]),
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const parsed = JSON.parse(response.text ?? "{}");
  return {
    collectionName: String(parsed.collection ?? ""),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    description: String(parsed.description ?? ""),
  };
}

/** Categorizes an inspiration item in place. Never throws — failures are recorded on the row. */
export async function categorizeInspirationItem(itemId: string) {
  const item = await db.inspirationItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  if (!process.env.GEMINI_API_KEY) {
    await db.inspirationItem.update({
      where: { id: itemId },
      data: { categorizeStatus: "SKIPPED" },
    });
    return;
  }

  const imagePath = item.type === "VIDEO" ? item.posterUrl : item.fileUrl;
  if (!imagePath) {
    await db.inspirationItem.update({
      where: { id: itemId },
      data: { categorizeStatus: "SKIPPED" },
    });
    return;
  }

  try {
    const collections = await db.collection.findMany({ select: { id: true, name: true } });
    const collectionNames = collections.map((c) => c.name);

    const buffer = await readLocalUpload(imagePath);
    const mimeType = guessMimeType(imagePath);

    const result = await askGemini(buffer.toString("base64"), mimeType, collectionNames);

    const matchedCollection =
      collections.find((c) => c.name.toLowerCase() === result.collectionName.toLowerCase()) ??
      (await db.collection.findUnique({ where: { name: "Uncategorized" } }));

    await db.inspirationItem.update({
      where: { id: itemId },
      data: {
        categorizeStatus: "DONE",
        collectionId: matchedCollection?.id,
        description: item.description ?? result.description,
        tags: {
          connectOrCreate: result.tags.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });
  } catch (error) {
    await db.inspirationItem.update({
      where: { id: itemId },
      data: {
        categorizeStatus: "ERROR",
        categorizeError: error instanceof Error ? error.message : "Categorization failed.",
      },
    });
  }
}

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
