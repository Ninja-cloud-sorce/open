import type { HeroImageKind } from "@/generated/prisma/enums";

export interface HeroImageDTO {
  id: string;
  parentId: string | null;
  kind: HeroImageKind;
  label: string;
  conceptName: string;
  prompt: string;
  seed: number;
  imageUrl: string;
  upscaledUrl: string | null;
  favorite: boolean;
  applied: boolean;
  order: number;
  treatments: HeroImageDTO[];
}

export interface HeroImageSetDTO {
  id: string;
  title: string;
  projectId: string | null;
  subjectPrompt: string | null;
  sourceTitle: string;
  images: HeroImageDTO[];
  updatedAt: string;
}

export interface HeroImageSetSummaryDTO {
  id: string;
  title: string;
  sourceTitle: string;
  updatedAt: string;
}
