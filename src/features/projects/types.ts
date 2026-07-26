import type { DesignLane, VariantStatus } from "@/generated/prisma/enums";

export interface DesignTokens {
  fontDisplay?: string;
  fontBody?: string;
  fontMono?: string;
  scaleRatio?: string;
  colorBg?: string;
  colorSurface?: string;
  colorText?: string;
  colorMuted?: string;
  colorAccent?: string;
  colorAccentText?: string;
  radius?: string;
  spacingUnit?: string;
  borderStyle?: string;
  motion?: string;
  texture?: string;
}

export interface VariantDTO {
  id: string;
  lane: DesignLane;
  label: string;
  styleName: string;
  rationale: string | null;
  designTokens: DesignTokens | null;
  previewHtml: string | null;
  fullSiteHtml: string | null;
  status: VariantStatus;
  error: string | null;
  selected: boolean;
  favorite: boolean;
  order: number;
}

export interface VariantRoundDTO {
  id: string;
  roundNumber: number;
  parentVariantId: string | null;
  parentStyleName: string | null;
  variants: VariantDTO[];
}

export interface ProjectDTO {
  id: string;
  name: string;
  serviceType: string | null;
  description: string | null;
  audience: string | null;
  designNotes: string | null;
  references: { id: string; title: string | null; fileUrl: string | null; posterUrl: string | null }[];
  rounds: VariantRoundDTO[];
  updatedAt: string;
}

export interface ProjectSummaryDTO {
  id: string;
  name: string;
  serviceType: string | null;
  roundCount: number;
  updatedAt: string;
}

export interface ProjectInput {
  name: string;
  serviceType?: string;
  description?: string;
  audience?: string;
  designNotes?: string;
  referenceIds?: string[];
}
