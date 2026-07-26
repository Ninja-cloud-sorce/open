"use server";

import { revalidatePath } from "next/cache";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/db";
import { getInspirationItemsByIds } from "@/features/inspiration/actions";
import { autofillFromReferences } from "@/features/prompts/autofill";
import type { PromptBriefDTO, PromptBriefFields, PromptBriefSummaryDTO } from "@/features/prompts/types";

const SECTIONS: { key: keyof PromptBriefFields; label: string }[] = [
  { key: "aesthetic", label: "Aesthetic" },
  { key: "intent", label: "Intent" },
  { key: "audience", label: "Audience" },
  { key: "constraints", label: "Constraints" },
  { key: "guardRails", label: "Guard Rails" },
  { key: "negativePrompt", label: "Negative Prompt" },
  { key: "componentStyle", label: "Component Style" },
  { key: "motionStyle", label: "Motion Style" },
  { key: "typographyStyle", label: "Typography Style" },
];

export async function listPromptBriefs(): Promise<PromptBriefSummaryDTO[]> {
  const briefs = await db.promptBrief.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { references: true } } },
  });
  return briefs.map((brief) => ({
    id: brief.id,
    title: brief.title,
    updatedAt: brief.updatedAt.toISOString(),
    referenceCount: brief._count.references,
  }));
}

export async function getPromptBrief(id: string): Promise<PromptBriefDTO | null> {
  const brief = await db.promptBrief.findUnique({ where: { id }, include: { references: true } });
  if (!brief) return null;
  const references = await getInspirationItemsByIds(brief.references.map((r) => r.id));
  return serializeBrief(brief, references);
}

export async function createPromptBrief(): Promise<PromptBriefSummaryDTO> {
  const brief = await db.promptBrief.create({ data: { title: "Untitled brief" } });
  revalidatePath("/prompts");
  return { id: brief.id, title: brief.title, updatedAt: brief.updatedAt.toISOString(), referenceCount: 0 };
}

export async function updatePromptBrief(
  id: string,
  input: PromptBriefFields & { referenceIds?: string[] }
): Promise<PromptBriefDTO | null> {
  const { referenceIds, ...fields } = input;
  await db.promptBrief.update({
    where: { id },
    data: {
      ...fields,
      ...(referenceIds ? { references: { set: referenceIds.map((refId) => ({ id: refId })) } } : {}),
    },
  });
  revalidatePath("/prompts");
  return getPromptBrief(id);
}

export async function deletePromptBrief(id: string) {
  await db.promptBrief.delete({ where: { id } });
  revalidatePath("/prompts");
}

export async function autofillBriefFromReferences(id: string): Promise<PromptBriefDTO | null> {
  const brief = await db.promptBrief.findUnique({ where: { id }, include: { references: true } });
  if (!brief) return null;

  const references = await getInspirationItemsByIds(brief.references.map((r) => r.id));
  const suggestions = autofillFromReferences(references);

  await db.promptBrief.update({
    where: { id },
    data: {
      aesthetic: brief.aesthetic ?? suggestions.aesthetic,
      typographyStyle: brief.typographyStyle ?? suggestions.typographyStyle,
      componentStyle: brief.componentStyle ?? suggestions.componentStyle,
      motionStyle: brief.motionStyle ?? suggestions.motionStyle,
      negativePrompt: brief.negativePrompt ?? suggestions.negativePrompt,
    },
  });
  revalidatePath("/prompts");
  return getPromptBrief(id);
}

export async function composeOutputPrompt(id: string): Promise<PromptBriefDTO | null> {
  const brief = await db.promptBrief.findUnique({ where: { id }, include: { references: true } });
  if (!brief) return null;

  const parts: string[] = [];
  for (const section of SECTIONS) {
    const value = brief[section.key as keyof typeof brief];
    if (typeof value === "string" && value.trim()) {
      parts.push(`${section.label}:\n${value.trim()}`);
    }
  }
  if (brief.references.length > 0) {
    const refLine = brief.references.map((r) => r.title ?? r.sourceUrl ?? r.id).join(", ");
    parts.splice(1, 0, `References:\n${refLine}`);
  }

  const outputPrompt = parts.join("\n\n");
  await db.promptBrief.update({ where: { id }, data: { outputPrompt } });
  revalidatePath("/prompts");
  return getPromptBrief(id);
}

export async function enhanceOutputPromptWithAI(id: string): Promise<{ brief: PromptBriefDTO | null; skipped: boolean }> {
  const brief = await db.promptBrief.findUnique({ where: { id } });
  if (!brief?.outputPrompt) return { brief: await getPromptBrief(id), skipped: true };

  if (!process.env.GEMINI_API_KEY) {
    return { brief: await getPromptBrief(id), skipped: true };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Rewrite the following design brief into tighter, more fluid prose. Preserve every constraint, section label, and piece of information — do not add or drop requirements, just improve the writing.\n\n${brief.outputPrompt}`,
    });
    const enhanced = response.text?.trim();
    if (enhanced) {
      await db.promptBrief.update({ where: { id }, data: { outputPrompt: enhanced } });
    }
    revalidatePath("/prompts");
    return { brief: await getPromptBrief(id), skipped: false };
  } catch {
    return { brief: await getPromptBrief(id), skipped: true };
  }
}

function serializeBrief(
  brief: NonNullable<Awaited<ReturnType<typeof db.promptBrief.findUnique>>>,
  references: PromptBriefDTO["references"]
): PromptBriefDTO {
  return {
    id: brief.id,
    title: brief.title,
    aesthetic: brief.aesthetic,
    intent: brief.intent,
    audience: brief.audience,
    constraints: brief.constraints,
    guardRails: brief.guardRails,
    negativePrompt: brief.negativePrompt,
    componentStyle: brief.componentStyle,
    motionStyle: brief.motionStyle,
    typographyStyle: brief.typographyStyle,
    outputPrompt: brief.outputPrompt,
    references,
    updatedAt: brief.updatedAt.toISOString(),
  };
}
