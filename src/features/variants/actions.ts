"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { DIRECTIONS, generateDirections, generateRefinements } from "@/features/variants/generate";
import type { VariantDTO, VariantSetDTO, VariantSetSummaryDTO } from "@/features/variants/types";

export async function listVariantSets(): Promise<VariantSetSummaryDTO[]> {
  const sets = await db.variantSet.findMany({
    orderBy: { updatedAt: "desc" },
    include: { brief: { select: { title: true } } },
  });
  return sets.map((set) => ({
    id: set.id,
    title: set.title,
    briefTitle: set.brief.title,
    updatedAt: set.updatedAt.toISOString(),
  }));
}

export async function getVariantSet(id: string): Promise<VariantSetDTO | null> {
  const set = await db.variantSet.findUnique({
    where: { id },
    include: {
      brief: { select: { title: true } },
      variants: { include: { refinements: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
    },
  });
  if (!set) return null;

  const directions = set.variants.filter((v) => v.kind === "DIRECTION");

  return {
    id: set.id,
    title: set.title,
    briefId: set.briefId,
    briefTitle: set.brief.title,
    updatedAt: set.updatedAt.toISOString(),
    variants: directions.map(serializeVariant),
  };
}

export async function createVariantSetFromBrief(briefId: string): Promise<{ id: string }> {
  const brief = await db.promptBrief.findUniqueOrThrow({ where: { id: briefId } });

  const set = await db.variantSet.create({
    data: {
      briefId,
      title: brief.title,
      variants: {
        create: DIRECTIONS.map((direction, index) => ({
          kind: "DIRECTION",
          label: `V${index + 1}`,
          styleName: direction.name,
          status: "PENDING",
          order: index,
        })),
      },
    },
  });

  revalidatePath("/variants");
  return { id: set.id };
}

export async function runDirectionGeneration(variantSetId: string): Promise<VariantSetDTO | null> {
  await generateDirections(variantSetId);
  revalidatePath(`/variants/${variantSetId}`);
  return getVariantSet(variantSetId);
}

export async function runRefinementGeneration(directionVariantId: string): Promise<VariantSetDTO | null> {
  const parent = await db.variant.findUniqueOrThrow({ where: { id: directionVariantId } });
  await generateRefinements(directionVariantId);
  revalidatePath(`/variants/${parent.variantSetId}`);
  return getVariantSet(parent.variantSetId);
}

export async function toggleFavorite(variantId: string): Promise<void> {
  const variant = await db.variant.findUniqueOrThrow({ where: { id: variantId } });
  await db.variant.update({ where: { id: variantId }, data: { favorite: !variant.favorite } });
  revalidatePath(`/variants/${variant.variantSetId}`);
}

export async function deleteVariant(id: string): Promise<void> {
  const variant = await db.variant.findUniqueOrThrow({ where: { id } });
  await db.variant.delete({ where: { id } });
  revalidatePath(`/variants/${variant.variantSetId}`);
}

export async function deleteVariantSet(id: string): Promise<void> {
  await db.variantSet.delete({ where: { id } });
  revalidatePath("/variants");
}

function serializeVariant(variant: {
  id: string;
  parentId: string | null;
  kind: VariantDTO["kind"];
  label: string;
  styleName: string;
  html: string | null;
  status: VariantDTO["status"];
  error: string | null;
  favorite: boolean;
  order: number;
  refinements?: Parameters<typeof serializeVariant>[0][];
}): VariantDTO {
  return {
    id: variant.id,
    parentId: variant.parentId,
    kind: variant.kind,
    label: variant.label,
    styleName: variant.styleName,
    html: variant.html,
    status: variant.status,
    error: variant.error,
    favorite: variant.favorite,
    order: variant.order,
    refinements: (variant.refinements ?? []).map(serializeVariant),
  };
}
