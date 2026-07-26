"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { buildPollinationsUrl, randomSeed, proposeBaseConcepts } from "@/features/hero-images/generate";
import { suggestHeroSubject } from "@/features/variants/generate";

/** Pre-fills the "what do you want to generate?" box from project context —
 *  a starting point the user edits, never a silent substitute for their input. */
export async function suggestSubjectForProject(projectId: string): Promise<string> {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { references: { include: { analysis: true } } },
  });

  return suggestHeroSubject({
    name: project.name,
    serviceType: project.serviceType,
    description: project.description,
    audience: project.audience,
    designNotes: project.designNotes,
    references: project.references.map((r) => ({
      title: r.title,
      analysisSummary: [r.analysis?.primaryStyle, r.analysis?.aiNotes].filter(Boolean).join(": ") || null,
    })),
  });
}

/** Creates a hero set for a project using the user's own subject description. */
export async function createHeroSetForProject(
  projectId: string,
  subjectPrompt: string
): Promise<{ id: string }> {
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });

  const concepts = await proposeBaseConcepts({
    aesthetic: [project.designNotes, subjectPrompt].filter(Boolean).join(". ") || null,
    intent: project.description,
    audience: project.audience,
  });

  const set = await db.heroImageSet.create({
    data: {
      projectId,
      title: project.name,
      subjectPrompt,
      images: {
        create: concepts.map((concept, index) => {
          const seed = randomSeed();
          // The user's own words lead the prompt; the concept angle refines it.
          const prompt = `${subjectPrompt}, ${concept.prompt}`;
          return {
            kind: "BASE" as const,
            label: String(index + 1),
            conceptName: concept.conceptName,
            prompt,
            seed,
            imageUrl: buildPollinationsUrl({ prompt, seed }),
            order: index,
          };
        }),
      },
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { id: set.id };
}

export async function listHeroSetsForProject(projectId: string) {
  const sets = await db.heroImageSet.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, subjectPrompt: true },
  });
  return sets;
}
