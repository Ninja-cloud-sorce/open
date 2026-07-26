"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { categorizeInspirationItem } from "@/features/inspiration/categorize";
import type { InspirationFilters } from "@/features/inspiration/types";

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
} as const;

export async function listInspirationItems(filters: InspirationFilters = {}) {
  const items = await db.inspirationItem.findMany({
    where: {
      collectionId: filters.collectionId || undefined,
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
    data: { type, fileUrl, posterUrl, title, categorizeStatus: "PENDING" },
    include: itemInclude,
  });

  revalidatePath("/inspiration");
  return serializeItem(item);
}

export async function runCategorization(itemId: string) {
  await categorizeInspirationItem(itemId);
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
      categorizeStatus: "SKIPPED",
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

function serializeItem(item: Prisma.InspirationItemGetPayload<{ include: typeof itemInclude }>) {
  return {
    id: item.id,
    type: item.type,
    fileUrl: item.fileUrl,
    posterUrl: item.posterUrl,
    sourceUrl: item.sourceUrl,
    title: item.title,
    description: item.description,
    categorizeStatus: item.categorizeStatus,
    categorizeError: item.categorizeError,
    collection: item.collection,
    tags: item.tags,
    createdAt: item.createdAt.toISOString(),
  };
}
