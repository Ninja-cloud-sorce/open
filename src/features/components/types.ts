import type { ComponentSource } from "@/generated/prisma/enums";
import type { ComponentCategory } from "@/features/components/extract";

export interface ComponentDTO {
  id: string;
  name: string;
  category: ComponentCategory;
  source: ComponentSource;
  html: string;
  css: string;
  tokens: string | null;
  prompt: string | null;
  notes: string | null;
  tags: { id: string; name: string }[];
  favorite: boolean;
  variantId: string | null;
  variantLabel: string | null;
  createdAt: string;
}

export interface ComponentFilters {
  category?: string;
  query?: string;
}

/** A section detected in a generated site, offered for saving. */
export interface CandidateSectionDTO {
  index: number;
  name: string;
  category: ComponentCategory;
  tag: string;
  html: string;
  previewDoc: string;
}

export interface VariantOptionDTO {
  id: string;
  label: string;
  styleName: string;
  projectName: string;
}
