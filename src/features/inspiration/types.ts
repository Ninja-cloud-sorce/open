import type { CategorizeStatus, InspirationType } from "@/generated/prisma/enums";

export interface InspirationItemDTO {
  id: string;
  type: InspirationType;
  fileUrl: string | null;
  posterUrl: string | null;
  sourceUrl: string | null;
  title: string | null;
  description: string | null;
  categorizeStatus: CategorizeStatus;
  categorizeError: string | null;
  collection: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
  createdAt: string;
}

export interface InspirationFilters {
  collectionId?: string;
  query?: string;
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
