import type { InspirationItemDTO } from "@/features/inspiration/types";

export interface PromptBriefSummaryDTO {
  id: string;
  title: string;
  updatedAt: string;
  referenceCount: number;
}

export interface PromptBriefDTO {
  id: string;
  title: string;
  aesthetic: string | null;
  intent: string | null;
  audience: string | null;
  constraints: string | null;
  guardRails: string | null;
  negativePrompt: string | null;
  componentStyle: string | null;
  motionStyle: string | null;
  typographyStyle: string | null;
  outputPrompt: string | null;
  references: InspirationItemDTO[];
  updatedAt: string;
}

export type PromptBriefFields = Partial<
  Pick<
    PromptBriefDTO,
    | "title"
    | "aesthetic"
    | "intent"
    | "audience"
    | "constraints"
    | "guardRails"
    | "negativePrompt"
    | "componentStyle"
    | "motionStyle"
    | "typographyStyle"
  >
>;
