"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { generateRound, expandToFullSite } from "@/features/variants/generate";
import type { DesignLane } from "@/generated/prisma/enums";
import type {
  DesignTokens,
  ProjectDTO,
  ProjectInput,
  ProjectSummaryDTO,
  VariantDTO,
  VariantRoundDTO,
} from "@/features/projects/types";

const LANE_PREFIX: Record<DesignLane, string> = { IMPECCABLE: "I", TASTE_SKILL: "T" };

export async function listProjects(): Promise<ProjectSummaryDTO[]> {
  const projects = await db.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { rounds: true } } },
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    serviceType: p.serviceType,
    roundCount: p._count.rounds,
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function getProject(id: string): Promise<ProjectDTO | null> {
  const project = await db.project.findUnique({
    where: { id },
    include: {
      references: { select: { id: true, title: true, fileUrl: true, posterUrl: true } },
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: {
          parentVariant: { select: { styleName: true } },
          variants: { orderBy: [{ lane: "asc" }, { order: "asc" }] },
        },
      },
    },
  });
  if (!project) return null;

  return {
    id: project.id,
    name: project.name,
    serviceType: project.serviceType,
    description: project.description,
    audience: project.audience,
    designNotes: project.designNotes,
    references: project.references,
    updatedAt: project.updatedAt.toISOString(),
    rounds: project.rounds.map(
      (round): VariantRoundDTO => ({
        id: round.id,
        roundNumber: round.roundNumber,
        parentVariantId: round.parentVariantId,
        parentStyleName: round.parentVariant?.styleName ?? null,
        variants: round.variants.map(serializeVariant),
      })
    ),
  };
}

export async function createProject(input: ProjectInput): Promise<{ id: string }> {
  const project = await db.project.create({
    data: {
      name: input.name || "Untitled project",
      serviceType: input.serviceType || null,
      description: input.description || null,
      audience: input.audience || null,
      designNotes: input.designNotes || null,
      ...(input.referenceIds?.length
        ? { references: { connect: input.referenceIds.map((id) => ({ id })) } }
        : {}),
    },
  });
  revalidatePath("/projects");
  return { id: project.id };
}

export async function updateProject(id: string, input: Partial<ProjectInput>): Promise<void> {
  const { referenceIds, ...fields } = input;
  await db.project.update({
    where: { id },
    data: {
      ...fields,
      ...(referenceIds ? { references: { set: referenceIds.map((refId) => ({ id: refId })) } } : {}),
    },
  });
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(id: string): Promise<void> {
  await db.project.delete({ where: { id } });
  revalidatePath("/projects");
}

/** Creates round 1 (both lanes, 5 each) or a refinement round off a picked variant. */
export async function startRound(projectId: string, parentVariantId?: string): Promise<{ roundId: string }> {
  const lastRound = await db.variantRound.findFirst({
    where: { projectId },
    orderBy: { roundNumber: "desc" },
  });
  const roundNumber = (lastRound?.roundNumber ?? 0) + 1;

  const parent = parentVariantId
    ? await db.variant.findUniqueOrThrow({ where: { id: parentVariantId } })
    : null;

  const lanes: DesignLane[] = parent ? [parent.lane] : ["IMPECCABLE", "TASTE_SKILL"];

  const round = await db.variantRound.create({
    data: {
      projectId,
      roundNumber,
      parentVariantId: parentVariantId ?? null,
      variants: {
        create: lanes.flatMap((lane) =>
          Array.from({ length: 5 }, (_, index) => ({
            lane,
            label: `${LANE_PREFIX[lane]}${roundNumber}.${index + 1}`,
            styleName: "Generating…",
            status: "PENDING" as const,
            order: index,
          }))
        ),
      },
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { roundId: round.id };
}

export async function runRoundGeneration(roundId: string): Promise<ProjectDTO | null> {
  const round = await db.variantRound.findUniqueOrThrow({ where: { id: roundId } });
  await generateRound(roundId);
  revalidatePath(`/projects/${round.projectId}`);
  return getProject(round.projectId);
}

/** Marks the winner of a round; the losing variants stay in the DB but the UI hides them. */
export async function selectVariant(variantId: string): Promise<void> {
  const variant = await db.variant.findUniqueOrThrow({
    where: { id: variantId },
    include: { round: true },
  });
  await db.$transaction([
    db.variant.updateMany({ where: { roundId: variant.roundId }, data: { selected: false } }),
    db.variant.update({ where: { id: variantId }, data: { selected: true } }),
  ]);
  revalidatePath(`/projects/${variant.round.projectId}`);
}

export async function runFullSiteGeneration(variantId: string): Promise<ProjectDTO | null> {
  const variant = await db.variant.findUniqueOrThrow({
    where: { id: variantId },
    include: { round: true },
  });
  await expandToFullSite(variantId);
  revalidatePath(`/projects/${variant.round.projectId}`);
  return getProject(variant.round.projectId);
}

export async function toggleVariantFavorite(variantId: string): Promise<void> {
  const variant = await db.variant.findUniqueOrThrow({
    where: { id: variantId },
    include: { round: true },
  });
  await db.variant.update({ where: { id: variantId }, data: { favorite: !variant.favorite } });
  revalidatePath(`/projects/${variant.round.projectId}`);
}

function serializeVariant(variant: {
  id: string;
  lane: DesignLane;
  label: string;
  styleName: string;
  rationale: string | null;
  designTokens: string | null;
  previewHtml: string | null;
  fullSiteHtml: string | null;
  status: VariantDTO["status"];
  error: string | null;
  selected: boolean;
  favorite: boolean;
  order: number;
}): VariantDTO {
  let tokens: DesignTokens | null = null;
  if (variant.designTokens) {
    try {
      tokens = JSON.parse(variant.designTokens);
    } catch {
      tokens = null;
    }
  }
  return {
    id: variant.id,
    lane: variant.lane,
    label: variant.label,
    styleName: variant.styleName,
    rationale: variant.rationale,
    designTokens: tokens,
    previewHtml: variant.previewHtml,
    fullSiteHtml: variant.fullSiteHtml,
    status: variant.status,
    error: variant.error,
    selected: variant.selected,
    favorite: variant.favorite,
    order: variant.order,
  };
}
