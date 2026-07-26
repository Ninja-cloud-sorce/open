"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listPromptBriefs,
  getPromptBrief,
  createPromptBrief,
  updatePromptBrief,
  deletePromptBrief,
  autofillBriefFromReferences,
  composeOutputPrompt,
  enhanceOutputPromptWithAI,
} from "@/features/prompts/actions";
import type { PromptBriefFields } from "@/features/prompts/types";

const keys = {
  briefs: ["prompt-briefs"] as const,
  brief: (id: string) => ["prompt-brief", id] as const,
};

export function usePromptBriefs() {
  return useQuery({ queryKey: keys.briefs, queryFn: listPromptBriefs });
}

export function usePromptBrief(id: string | null) {
  return useQuery({
    queryKey: keys.brief(id ?? ""),
    queryFn: () => getPromptBrief(id!),
    enabled: Boolean(id),
  });
}

function useInvalidateBriefs() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["prompt-briefs"] });
    queryClient.invalidateQueries({ queryKey: ["prompt-brief"] });
  };
}

export function useCreatePromptBrief() {
  const invalidate = useInvalidateBriefs();
  return useMutation({ mutationFn: createPromptBrief, onSuccess: invalidate });
}

export function useUpdatePromptBrief() {
  const invalidate = useInvalidateBriefs();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PromptBriefFields & { referenceIds?: string[] } }) =>
      updatePromptBrief(id, input),
    onSuccess: invalidate,
  });
}

export function useDeletePromptBrief() {
  const invalidate = useInvalidateBriefs();
  return useMutation({ mutationFn: (id: string) => deletePromptBrief(id), onSuccess: invalidate });
}

export function useAutofillBrief() {
  const invalidate = useInvalidateBriefs();
  return useMutation({ mutationFn: (id: string) => autofillBriefFromReferences(id), onSuccess: invalidate });
}

export function useComposeOutputPrompt() {
  const invalidate = useInvalidateBriefs();
  return useMutation({ mutationFn: (id: string) => composeOutputPrompt(id), onSuccess: invalidate });
}

export function useEnhanceOutputPrompt() {
  const invalidate = useInvalidateBriefs();
  return useMutation({ mutationFn: (id: string) => enhanceOutputPromptWithAI(id), onSuccess: invalidate });
}
