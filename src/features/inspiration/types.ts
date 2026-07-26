import type { AnalysisStatus, InspirationType } from "@/generated/prisma/enums";

export interface ColorSwatchDTO {
  name: string;
  hex: string;
  percentage: number;
}

export interface InspirationAnalysisDTO {
  status: AnalysisStatus;
  error: string | null;
  primaryStyle: string | null;
  secondaryStyles: string[];
  confidence: number | null;
  visualTone: string | null;
  designLanguage: string | null;
  mood: string[];
  industry: string | null;
  layoutStyle: string | null;
  gridSystem: string | null;
  spacingDensity: string | null;
  visualHierarchy: string | null;
  typographyHeadline: string | null;
  typographyBody: string | null;
  typographyWeight: string | null;
  typographyStyle: string | null;
  colorPalette: ColorSwatchDTO[];
  illustrationStyle: string | null;
  iconStyle: string | null;
  textures: string | null;
  lighting: string | null;
  depth: string | null;
  animationStyle: string | null;
  components: string[];
  keywords: string[];
  scores: {
    minimalism: number | null;
    premium: number | null;
    creativity: number | null;
    technical: number | null;
    storytelling: number | null;
    visualDensity: number | null;
    accessibility: number | null;
    consistency: number | null;
  };
  aiNotes: string | null;
}

export interface InspirationItemDTO {
  id: string;
  type: InspirationType;
  fileUrl: string | null;
  posterUrl: string | null;
  sourceUrl: string | null;
  title: string | null;
  description: string | null;
  collection: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
  analysis: InspirationAnalysisDTO | null;
  createdAt: string;
}

export interface SimilarInspirationItemDTO extends InspirationItemDTO {
  similarity: number;
}

export interface InspirationFilters {
  collectionId?: string;
  primaryStyle?: string;
  industry?: string;
  layoutStyle?: string;
  mood?: string;
  query?: string;
}

export interface FacetOptionsDTO {
  industries: SmartCollectionDTO[];
  layoutStyles: SmartCollectionDTO[];
  moods: SmartCollectionDTO[];
}

export interface InspirationSourceDTO {
  id: string;
  name: string;
  url: string;
  faviconUrl: string;
  order: number;
}

export interface CollectionDTO {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
}

export interface SmartCollectionDTO {
  value: string;
  count: number;
}
