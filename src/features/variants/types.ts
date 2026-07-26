import type { VariantKind, VariantStatus } from "@/generated/prisma/enums";

export interface VariantDTO {
  id: string;
  parentId: string | null;
  kind: VariantKind;
  label: string;
  styleName: string;
  html: string | null;
  status: VariantStatus;
  error: string | null;
  favorite: boolean;
  order: number;
  refinements: VariantDTO[];
}

export interface VariantSetDTO {
  id: string;
  title: string;
  briefId: string;
  briefTitle: string;
  variants: VariantDTO[];
  updatedAt: string;
}

export interface VariantSetSummaryDTO {
  id: string;
  title: string;
  briefTitle: string;
  updatedAt: string;
}
