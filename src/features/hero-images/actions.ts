"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  buildPollinationsUrl,
  buildUpscaledUrl,
  randomSeed,
  proposeBaseConcepts,
  proposeTreatments,
} from "@/features/hero-images/generate";
import type { HeroImageDTO, HeroImageSetDTO, HeroImageSetSummaryDTO } from "@/features/hero-images/types";

export async function listHeroImageSets(): Promise<HeroImageSetSummaryDTO[]> {
  const sets = await db.heroImageSet.findMany({
    orderBy: { updatedAt: "desc" },
    include: { brief: { select: { title: true } }, project: { select: { name: true } } },
  });
  return sets.map((set) => ({
    id: set.id,
    title: set.title,
    sourceTitle: set.project?.name ?? set.brief?.title ?? "Standalone",
    updatedAt: set.updatedAt.toISOString(),
  }));
}

export async function getHeroImageSet(id: string): Promise<HeroImageSetDTO | null> {
  const set = await db.heroImageSet.findUnique({
    where: { id },
    include: {
      brief: { select: { title: true } },
      project: { select: { name: true } },
      images: { include: { treatments: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
    },
  });
  if (!set) return null;

  const bases = set.images.filter((img) => img.kind === "BASE");

  return {
    id: set.id,
    title: set.title,
    projectId: set.projectId,
    subjectPrompt: set.subjectPrompt,
    sourceTitle: set.project?.name ?? set.brief?.title ?? "Standalone",
    updatedAt: set.updatedAt.toISOString(),
    images: bases.map(serializeImage),
  };
}

export async function createHeroImageSet(briefId: string): Promise<{ id: string }> {
  const brief = await db.promptBrief.findUniqueOrThrow({ where: { id: briefId } });
  const concepts = await proposeBaseConcepts(brief);

  const set = await db.heroImageSet.create({
    data: {
      briefId,
      title: brief.title,
      images: {
        create: concepts.map((concept, index) => {
          const seed = randomSeed();
          return {
            kind: "BASE",
            label: String(index + 1),
            conceptName: concept.conceptName,
            prompt: concept.prompt,
            seed,
            imageUrl: buildPollinationsUrl({ prompt: concept.prompt, seed }),
            order: index,
          };
        }),
      },
    },
  });

  revalidatePath("/hero-images");
  return { id: set.id };
}

export async function createTreatments(baseImageId: string): Promise<HeroImageSetDTO | null> {
  const base = await db.heroImage.findUniqueOrThrow({ where: { id: baseImageId } });
  const treatments = await proposeTreatments(base.prompt);

  const existing = await db.heroImage.findMany({ where: { parentId: base.id }, orderBy: { order: "asc" } });
  const labels = ["A", "B", "C", "D", "E"];

  await Promise.all(
    treatments.map((treatment, index) => {
      const prompt = `${base.prompt}, ${treatment.promptSuffix}`;
      const data = {
        conceptName: treatment.conceptName,
        prompt,
        imageUrl: buildPollinationsUrl({ prompt, seed: base.seed }),
      };
      return existing[index]
        ? db.heroImage.update({ where: { id: existing[index].id }, data })
        : db.heroImage.create({
            data: {
              setId: base.setId,
              parentId: base.id,
              kind: "TREATMENT",
              label: labels[index],
              seed: base.seed,
              order: index,
              ...data,
            },
          });
    })
  );

  revalidatePath(`/hero-images/${base.setId}`);
  return getHeroImageSet(base.setId);
}

export async function regenerateHeroImage(id: string): Promise<void> {
  const image = await db.heroImage.findUniqueOrThrow({ where: { id } });
  const seed = randomSeed();
  await db.heroImage.update({
    where: { id },
    data: { seed, imageUrl: buildPollinationsUrl({ prompt: image.prompt, seed }), upscaledUrl: null },
  });
  revalidatePath(`/hero-images/${image.setId}`);
}

export async function upscaleHeroImage(id: string): Promise<void> {
  const image = await db.heroImage.findUniqueOrThrow({ where: { id } });
  await db.heroImage.update({
    where: { id },
    data: { upscaledUrl: buildUpscaledUrl(image.prompt, image.seed) },
  });
  revalidatePath(`/hero-images/${image.setId}`);
}

export async function toggleFavorite(id: string): Promise<void> {
  const image = await db.heroImage.findUniqueOrThrow({ where: { id } });
  await db.heroImage.update({ where: { id }, data: { favorite: !image.favorite } });
  revalidatePath(`/hero-images/${image.setId}`);
}

export async function applyHeroImage(id: string): Promise<void> {
  const image = await db.heroImage.findUniqueOrThrow({ where: { id }, include: { set: true } });

  const briefSetIds = await db.heroImageSet.findMany({
    where: { briefId: image.set.briefId },
    select: { id: true },
  });

  await db.$transaction([
    db.heroImage.updateMany({
      where: { setId: { in: briefSetIds.map((s) => s.id) }, applied: true },
      data: { applied: false },
    }),
    db.heroImage.update({ where: { id }, data: { applied: true } }),
  ]);

  revalidatePath(`/hero-images/${image.setId}`);
}

export async function deleteHeroImage(id: string): Promise<void> {
  const image = await db.heroImage.findUniqueOrThrow({ where: { id } });
  await db.heroImage.delete({ where: { id } });
  revalidatePath(`/hero-images/${image.setId}`);
}

export async function deleteHeroImageSet(id: string): Promise<void> {
  await db.heroImageSet.delete({ where: { id } });
  revalidatePath("/hero-images");
}

function serializeImage(image: {
  id: string;
  parentId: string | null;
  kind: HeroImageDTO["kind"];
  label: string;
  conceptName: string;
  prompt: string;
  seed: number;
  imageUrl: string;
  upscaledUrl: string | null;
  favorite: boolean;
  applied: boolean;
  order: number;
  treatments?: Parameters<typeof serializeImage>[0][];
}): HeroImageDTO {
  return {
    id: image.id,
    parentId: image.parentId,
    kind: image.kind,
    label: image.label,
    conceptName: image.conceptName,
    prompt: image.prompt,
    seed: image.seed,
    imageUrl: image.imageUrl,
    upscaledUrl: image.upscaledUrl,
    favorite: image.favorite,
    applied: image.applied,
    order: image.order,
    treatments: (image.treatments ?? []).map(serializeImage),
  };
}
