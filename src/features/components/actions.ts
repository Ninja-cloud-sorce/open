"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { humanizeAiError } from "@/lib/ai-errors";
import { generateComponent } from "@/features/components/generate";
import {
  extractSections,
  extractStyles,
  extractFontLinks,
  buildPreviewDocument,
  type ComponentCategory,
} from "@/features/components/extract";
import type {
  CandidateSectionDTO,
  ComponentDTO,
  ComponentFilters,
  VariantOptionDTO,
} from "@/features/components/types";

const componentInclude = { tags: { select: { id: true, name: true } }, variant: { select: { label: true } } } as const;

export async function listComponents(filters: ComponentFilters = {}): Promise<ComponentDTO[]> {
  const rows = await db.component.findMany({
    where: {
      category: filters.category || undefined,
      ...(filters.query
        ? {
            OR: [
              { name: { contains: filters.query } },
              { notes: { contains: filters.query } },
              { tags: { some: { name: { contains: filters.query } } } },
            ],
          }
        : {}),
    },
    include: componentInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serialize);
}

export async function getComponent(id: string): Promise<ComponentDTO | null> {
  const row = await db.component.findUnique({ where: { id }, include: componentInclude });
  return row ? serialize(row) : null;
}

/** Variants that have a built full site, i.e. something worth harvesting. */
export async function listExtractableVariants(): Promise<VariantOptionDTO[]> {
  const variants = await db.variant.findMany({
    where: { fullSiteHtml: { not: null } },
    include: { round: { include: { project: { select: { name: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
  return variants.map((v) => ({
    id: v.id,
    label: v.label,
    styleName: v.styleName,
    projectName: v.round.project.name,
  }));
}

/** Detects candidate sections. Does not save — the user picks which to keep. */
export async function detectSections(variantId: string): Promise<CandidateSectionDTO[]> {
  const variant = await db.variant.findUniqueOrThrow({ where: { id: variantId } });
  const document = variant.fullSiteHtml ?? variant.previewHtml ?? "";
  if (!document) return [];

  const css = extractStyles(document);
  const fontLinks = extractFontLinks(document);

  return extractSections(document).map((section, index) => ({
    index,
    name: section.name,
    category: section.category,
    tag: section.tag,
    html: section.html,
    previewDoc: buildPreviewDocument({ html: section.html, css, fontLinks }),
  }));
}

export async function saveExtractedSections(
  variantId: string,
  selections: { index: number; name: string; category: string }[]
): Promise<void> {
  const variant = await db.variant.findUniqueOrThrow({ where: { id: variantId } });
  const document = variant.fullSiteHtml ?? variant.previewHtml ?? "";
  const css = extractStyles(document);
  const fontLinks = extractFontLinks(document);
  const sections = extractSections(document);

  for (const pick of selections) {
    const section = sections[pick.index];
    if (!section) continue;
    await db.component.create({
      data: {
        name: pick.name || section.name,
        category: pick.category || section.category,
        source: "EXTRACTED",
        html: section.html,
        // Font links ride along with the CSS so the component renders on its own.
        css: fontLinks ? `${fontLinks}\n<!--fonts-->\n${css}` : css,
        tokens: variant.designTokens,
        prompt: `Extracted from ${variant.label} “${variant.styleName}”`,
        variantId: variant.id,
      },
    });
  }

  revalidatePath("/components");
}

export async function runComponentGeneration(input: {
  category: string;
  styleNotes?: string;
  variantId?: string;
}): Promise<{ id: string } | { error: string }> {
  try {
    const tokens = input.variantId
      ? (await db.variant.findUnique({ where: { id: input.variantId } }))?.designTokens ?? null
      : null;

    const result = await generateComponent({
      category: input.category as ComponentCategory,
      styleNotes: input.styleNotes,
      tokens,
    });

    const created = await db.component.create({
      data: {
        name: input.styleNotes?.slice(0, 60) || input.category,
        category: input.category,
        source: "GENERATED",
        html: result.html,
        css: result.fontLinks ? `${result.fontLinks}\n<!--fonts-->\n${result.css}` : result.css,
        tokens,
        prompt: input.styleNotes || null,
        variantId: input.variantId ?? null,
      },
    });

    revalidatePath("/components");
    return { id: created.id };
  } catch (error) {
    return { error: humanizeAiError(error) };
  }
}

export async function updateComponent(
  id: string,
  input: { name?: string; category?: string; notes?: string; tagNames?: string[] }
): Promise<void> {
  await db.component.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      notes: input.notes,
      ...(input.tagNames
        ? {
            tags: {
              set: [],
              connectOrCreate: input.tagNames
                .map((n) => n.trim().toLowerCase())
                .filter(Boolean)
                .map((name) => ({ where: { name }, create: { name } })),
            },
          }
        : {}),
    },
  });
  revalidatePath("/components");
}

export async function toggleComponentFavorite(id: string): Promise<void> {
  const row = await db.component.findUniqueOrThrow({ where: { id } });
  await db.component.update({ where: { id }, data: { favorite: !row.favorite } });
  revalidatePath("/components");
}

export async function deleteComponent(id: string): Promise<void> {
  await db.component.delete({ where: { id } });
  revalidatePath("/components");
}

function serialize(row: {
  id: string;
  name: string;
  category: string;
  source: ComponentDTO["source"];
  html: string;
  css: string;
  tokens: string | null;
  prompt: string | null;
  notes: string | null;
  favorite: boolean;
  variantId: string | null;
  createdAt: Date;
  tags: { id: string; name: string }[];
  variant?: { label: string } | null;
}): ComponentDTO {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ComponentCategory,
    source: row.source,
    html: row.html,
    css: row.css,
    tokens: row.tokens,
    prompt: row.prompt,
    notes: row.notes,
    tags: row.tags,
    favorite: row.favorite,
    variantId: row.variantId,
    variantLabel: row.variant?.label ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
