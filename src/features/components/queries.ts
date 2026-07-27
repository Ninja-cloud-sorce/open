"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listComponents,
  getComponent,
  listExtractableVariants,
  detectSections,
  saveExtractedSections,
  runComponentGeneration,
  updateComponent,
  toggleComponentFavorite,
  deleteComponent,
} from "@/features/components/actions";
import type { ComponentFilters } from "@/features/components/types";

const keys = {
  list: (filters: ComponentFilters) => ["components", filters] as const,
  one: (id: string) => ["component", id] as const,
  variants: ["component-extractable-variants"] as const,
  sections: (variantId: string) => ["component-sections", variantId] as const,
};

export function useComponents(filters: ComponentFilters) {
  return useQuery({ queryKey: keys.list(filters), queryFn: () => listComponents(filters) });
}

export function useComponent(id: string | null) {
  return useQuery({
    queryKey: keys.one(id ?? ""),
    queryFn: () => getComponent(id!),
    enabled: Boolean(id),
  });
}

export function useExtractableVariants() {
  return useQuery({ queryKey: keys.variants, queryFn: listExtractableVariants });
}

export function useDetectedSections(variantId: string | null) {
  return useQuery({
    queryKey: keys.sections(variantId ?? ""),
    queryFn: () => detectSections(variantId!),
    enabled: Boolean(variantId),
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["components"] });
    queryClient.invalidateQueries({ queryKey: ["component"] });
  };
}

export function useSaveExtractedSections() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { variantId: string; selections: { index: number; name: string; category: string }[] }) =>
      saveExtractedSections(input.variantId, input.selections),
    onSuccess: invalidate,
  });
}

export function useRunComponentGeneration() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { category: string; styleNotes?: string; variantId?: string }) =>
      runComponentGeneration(input),
    onSuccess: invalidate,
  });
}

export function useUpdateComponent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateComponent>[1] }) =>
      updateComponent(id, input),
    onSuccess: invalidate,
  });
}

export function useToggleComponentFavorite() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => toggleComponentFavorite(id), onSuccess: invalidate });
}

export function useDeleteComponent() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => deleteComponent(id), onSuccess: invalidate });
}
