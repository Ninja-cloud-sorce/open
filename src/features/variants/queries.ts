"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listVariantSets,
  getVariantSet,
  createVariantSetFromBrief,
  runDirectionGeneration,
  runRefinementGeneration,
  toggleFavorite,
  deleteVariant,
  deleteVariantSet,
} from "@/features/variants/actions";

const keys = {
  sets: ["variant-sets"] as const,
  set: (id: string) => ["variant-set", id] as const,
};

export function useVariantSets() {
  return useQuery({ queryKey: keys.sets, queryFn: listVariantSets });
}

export function useVariantSet(id: string | null) {
  return useQuery({
    queryKey: keys.set(id ?? ""),
    queryFn: () => getVariantSet(id!),
    enabled: Boolean(id),
  });
}

function useInvalidateSet(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: keys.set(id) });
    queryClient.invalidateQueries({ queryKey: keys.sets });
  };
}

export function useCreateVariantSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (briefId: string) => createVariantSetFromBrief(briefId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.sets }),
  });
}

export function useRunDirectionGeneration(variantSetId: string) {
  const invalidate = useInvalidateSet(variantSetId);
  return useMutation({
    mutationFn: () => runDirectionGeneration(variantSetId),
    onSuccess: invalidate,
  });
}

export function useRunRefinementGeneration(variantSetId: string) {
  const invalidate = useInvalidateSet(variantSetId);
  return useMutation({
    mutationFn: (directionVariantId: string) => runRefinementGeneration(directionVariantId),
    onSuccess: invalidate,
  });
}

export function useToggleFavorite(variantSetId: string) {
  const invalidate = useInvalidateSet(variantSetId);
  return useMutation({ mutationFn: (variantId: string) => toggleFavorite(variantId), onSuccess: invalidate });
}

export function useDeleteVariant(variantSetId: string) {
  const invalidate = useInvalidateSet(variantSetId);
  return useMutation({ mutationFn: (id: string) => deleteVariant(id), onSuccess: invalidate });
}

export function useDeleteVariantSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVariantSet(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.sets }),
  });
}
