"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { analyzeInspirationItem, embedQueryText } from "@/features/inspiration/analyze";
import { cosineSimilarity } from "@/features/inspiration/lib/similarity";
import type {
  FacetOptionsDTO,
  InspirationFilters,
  SimilarInspirationItemDTO,
  SmartCollectionDTO,
} from "@/features/inspiration/types";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "inspiration");

async function saveUpload(file: File): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/inspiration/${filename}`;
}

const itemInclude = {
  collection: { select: { id: true, name: true } },
  tags: { select: { id: true, name: true } },
  analysis: true,
} as const;

type ItemWithRelations = Prisma.InspirationItemGetPayload<{ include: typeof itemInclude }>;

export async function listInspirationItems(filters: InspirationFilters = {}) {
  const items = await db.inspirationItem.findMany({
    where: {
      collectionId: filters.collectionId || undefined,
      ...(filters.primaryStyle || filters.industry || filters.layoutStyle || filters.mood
        ? {
            analysis: {
              primaryStyle: filters.primaryStyle || undefined,
              industry: filters.industry || undefined,
              layoutStyle: filters.layoutStyle || undefined,
              ...(filters.mood ? { mood: { contains: `"${filters.mood}"` } } : {}),
            },
          }
        : {}),
      ...(filters.query
        ? {
            OR: [
              { title: { contains: filters.query } },
              { description: { contains: filters.query } },
              { tags: { some: { name: { contains: filters.query } } } },
            ],
          }
        : {}),
    },
    include: itemInclude,
    orderBy: { createdAt: "desc" },
  });

  if (!filters.query) return items.map(serializeItem);

  // Blend in semantic ranking when embeddings exist; falls back to the
  // keyword `contains` match above if no items have one yet.
  const queryEmbedding = await embedQueryText(filters.query);
  if (!queryEmbedding) return items.map(serializeItem);

  const allWithEmbeddings = await db.inspirationItem.findMany({
    where: { analysis: { status: "DONE", embedding: { not: null } } },
    include: itemInclude,
  });

  const ranked = allWithEmbeddings
    .map((item) => ({
      item,
      similarity: cosineSimilarity(queryEmbedding, JSON.parse(item.analysis!.embedding!)),
    }))
    .filter((entry) => entry.similarity > 0.5)
    .sort((a, b) => b.similarity - a.similarity)
    .map((entry) => entry.item);

  const merged = new Map<string, ItemWithRelations>();
  for (const item of ranked) merged.set(item.id, item);
  for (const item of items) if (!merged.has(item.id)) merged.set(item.id, item);

  return Array.from(merged.values()).map(serializeItem);
}

/** Fetches a single item by id regardless of the current list filters — used when
 * switching the detail sheet to an item (e.g. via "Find Similar") that may not be
 * in the currently-filtered grid. */
export async function getInspirationItem(id: string) {
  const item = await db.inspirationItem.findUnique({ where: { id }, include: itemInclude });
  return item ? serializeItem(item) : null;
}

/** Batch variant of getInspirationItem, e.g. for resolving a PromptBrief's references. */
export async function getInspirationItemsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const items = await db.inspirationItem.findMany({ where: { id: { in: ids } }, include: itemInclude });
  return items.map(serializeItem);
}

export async function uploadInspirationItem(formData: FormData) {
  const file = formData.get("file") as File | null;
  const poster = formData.get("poster") as File | null;
  const type = formData.get("type") as "IMAGE" | "VIDEO";
  const title = (formData.get("title") as string) || null;

  if (!file) throw new Error("No file provided.");

  const fileUrl = await saveUpload(file);
  const posterUrl = poster ? await saveUpload(poster) : null;

  const item = await db.inspirationItem.create({
    data: { type, fileUrl, posterUrl, title, analysis: { create: { status: "PENDING" } } },
    include: itemInclude,
  });

  revalidatePath("/inspiration");
  return serializeItem(item);
}

export async function runAnalysis(itemId: string) {
  await analyzeInspirationItem(itemId);
  revalidatePath("/inspiration");
  const item = await db.inspirationItem.findUniqueOrThrow({
    where: { id: itemId },
    include: itemInclude,
  });
  return serializeItem(item);
}

export async function createUrlOrNoteItem(input: {
  type: "URL" | "NOTE";
  sourceUrl?: string;
  title?: string;
  description?: string;
  collectionId?: string;
}) {
  const item = await db.inspirationItem.create({
    data: {
      type: input.type,
      sourceUrl: input.sourceUrl || null,
      title: input.title || null,
      description: input.description || null,
      collectionId: input.collectionId || null,
      analysis: { create: { status: "SKIPPED" } },
    },
    include: itemInclude,
  });
  revalidatePath("/inspiration");
  return serializeItem(item);
}

export async function updateInspirationItem(
  id: string,
  input: { title?: string; description?: string; collectionId?: string | null; tagNames?: string[] }
) {
  const item = await db.inspirationItem.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      collectionId: input.collectionId,
      ...(input.tagNames
        ? {
            tags: {
              set: [],
              connectOrCreate: input.tagNames.map((name) => ({ where: { name }, create: { name } })),
            },
          }
        : {}),
    },
    include: itemInclude,
  });
  revalidatePath("/inspiration");
  return serializeItem(item);
}

export async function deleteInspirationItem(id: string) {
  const item = await db.inspirationItem.findUnique({ where: { id } });
  if (item) {
    for (const relativeUrl of [item.fileUrl, item.posterUrl]) {
      if (!relativeUrl) continue;
      await unlink(path.join(process.cwd(), "public", relativeUrl)).catch(() => {});
    }
  }
  await db.inspirationItem.delete({ where: { id } });
  revalidatePath("/inspiration");
}

export async function findSimilarInspirationItems(itemId: string, limit = 8): Promise<SimilarInspirationItemDTO[]> {
  const target = await db.inspirationAnalysis.findUnique({ where: { itemId } });
  if (!target?.embedding) return [];
  const targetEmbedding = JSON.parse(target.embedding) as number[];

  const candidates = await db.inspirationItem.findMany({
    where: { id: { not: itemId }, analysis: { status: "DONE", embedding: { not: null } } },
    include: itemInclude,
  });

  return candidates
    .map((item) => ({
      item,
      similarity: cosineSimilarity(targetEmbedding, JSON.parse(item.analysis!.embedding!)),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(({ item, similarity }) => ({ ...serializeItem(item), similarity: Math.round(similarity * 100) }));
}

export async function listSmartCollections(): Promise<SmartCollectionDTO[]> {
  const rows = await db.inspirationAnalysis.groupBy({
    by: ["primaryStyle"],
    where: { status: "DONE", primaryStyle: { not: null } },
    _count: { primaryStyle: true },
    orderBy: { _count: { primaryStyle: "desc" } },
    take: 8,
  });
  return rows.map((row) => ({ value: row.primaryStyle!, count: row._count.primaryStyle }));
}

export async function listFacetOptions(): Promise<FacetOptionsDTO> {
  const [industryRows, layoutRows, analyses] = await Promise.all([
    db.inspirationAnalysis.groupBy({
      by: ["industry"],
      where: { status: "DONE", industry: { not: null } },
      _count: { industry: true },
      orderBy: { _count: { industry: "desc" } },
      take: 12,
    }),
    db.inspirationAnalysis.groupBy({
      by: ["layoutStyle"],
      where: { status: "DONE", layoutStyle: { not: null } },
      _count: { layoutStyle: true },
      orderBy: { _count: { layoutStyle: "desc" } },
      take: 12,
    }),
    db.inspirationAnalysis.findMany({ where: { status: "DONE" }, select: { mood: true } }),
  ]);

  const moodCounts = new Map<string, number>();
  for (const row of analyses) {
    for (const mood of parseJsonArray(row.mood) as string[]) {
      moodCounts.set(mood, (moodCounts.get(mood) ?? 0) + 1);
    }
  }
  const moods = Array.from(moodCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    industries: industryRows.map((row) => ({ value: row.industry!, count: row._count.industry })),
    layoutStyles: layoutRows.map((row) => ({ value: row.layoutStyle!, count: row._count.layoutStyle })),
    moods,
  };
}

export async function listCollections() {
  const collections = await db.collection.findMany({ orderBy: { createdAt: "asc" } });
  return collections;
}

export async function createCollection(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const collection = await db.collection.upsert({
    where: { name },
    update: {},
    create: { name, slug },
  });
  revalidatePath("/inspiration");
  return collection;
}

export async function listInspirationSources() {
  return db.inspirationSource.findMany({ orderBy: { order: "asc" } });
}

export async function createInspirationSource(name: string, url: string) {
  const normalizedUrl = /^https?:\/\//.test(url) ? url : `https://${url}`;
  const faviconUrl = `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(normalizedUrl)}`;
  const count = await db.inspirationSource.count();
  const source = await db.inspirationSource.create({
    data: { name, url: normalizedUrl, faviconUrl, order: count },
  });
  revalidatePath("/inspiration");
  return source;
}

export async function deleteInspirationSource(id: string) {
  await db.inspirationSource.delete({ where: { id } });
  revalidatePath("/inspiration");
}

function serializeItem(item: ItemWithRelations) {
  const analysis = item.analysis;
  return {
    id: item.id,
    type: item.type,
    fileUrl: item.fileUrl,
    posterUrl: item.posterUrl,
    sourceUrl: item.sourceUrl,
    title: item.title,
    description: item.description,
    collection: item.collection,
    tags: item.tags,
    analysis: analysis
      ? {
          status: analysis.status,
          error: analysis.error,
          primaryStyle: analysis.primaryStyle,
          secondaryStyles: parseJsonArray(analysis.secondaryStyles),
          confidence: analysis.confidence,
          visualTone: analysis.visualTone,
          designLanguage: analysis.designLanguage,
          mood: parseJsonArray(analysis.mood),
          industry: analysis.industry,
          layoutStyle: analysis.layoutStyle,
          gridSystem: analysis.gridSystem,
          spacingDensity: analysis.spacingDensity,
          visualHierarchy: analysis.visualHierarchy,
          typographyHeadline: analysis.typographyHeadline,
          typographyBody: analysis.typographyBody,
          typographyWeight: analysis.typographyWeight,
          typographyStyle: analysis.typographyStyle,
          colorPalette: parseJsonArray(analysis.colorPalette),
          illustrationStyle: analysis.illustrationStyle,
          iconStyle: analysis.iconStyle,
          textures: analysis.textures,
          lighting: analysis.lighting,
          depth: analysis.depth,
          animationStyle: analysis.animationStyle,
          components: parseJsonArray(analysis.components),
          keywords: parseJsonArray(analysis.keywords),
          scores: {
            minimalism: analysis.scoreMinimalism,
            premium: analysis.scorePremium,
            creativity: analysis.scoreCreativity,
            technical: analysis.scoreTechnical,
            storytelling: analysis.scoreStorytelling,
            visualDensity: analysis.scoreVisualDensity,
            accessibility: analysis.scoreAccessibility,
            consistency: analysis.scoreConsistency,
          },
          aiNotes: analysis.aiNotes,
        }
      : null,
    createdAt: item.createdAt.toISOString(),
  };
}

function parseJsonArray(value: string | null) {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
