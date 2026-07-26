"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listHeroImageSets,
  getHeroImageSet,
  createHeroImageSet,
  createTreatments,
  regenerateHeroImage,
  upscaleHeroImage,
  toggleFavorite,
  applyHeroImage,
  deleteHeroImage,
  deleteHeroImageSet,
} from "@/features/hero-images/actions";

const keys = {
  sets: ["hero-image-sets"] as const,
  set: (id: string) => ["hero-image-set", id] as const,
};

export function useHeroImageSets() {
  return useQuery({ queryKey: keys.sets, queryFn: listHeroImageSets });
}

export function useHeroImageSet(id: string | null) {
  return useQuery({
    queryKey: keys.set(id ?? ""),
    queryFn: () => getHeroImageSet(id!),
    enabled: Boolean(id),
  });
}

function useInvalidateSet(setId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: keys.set(setId) });
    queryClient.invalidateQueries({ queryKey: keys.sets });
  };
}

export function useCreateHeroImageSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (briefId: string) => createHeroImageSet(briefId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.sets }),
  });
}

export function useCreateTreatments(setId: string) {
  const invalidate = useInvalidateSet(setId);
  return useMutation({ mutationFn: (baseImageId: string) => createTreatments(baseImageId), onSuccess: invalidate });
}

export function useRegenerateHeroImage(setId: string) {
  const invalidate = useInvalidateSet(setId);
  return useMutation({ mutationFn: (id: string) => regenerateHeroImage(id), onSuccess: invalidate });
}

export function useUpscaleHeroImage(setId: string) {
  const invalidate = useInvalidateSet(setId);
  return useMutation({ mutationFn: (id: string) => upscaleHeroImage(id), onSuccess: invalidate });
}

export function useToggleHeroFavorite(setId: string) {
  const invalidate = useInvalidateSet(setId);
  return useMutation({ mutationFn: (id: string) => toggleFavorite(id), onSuccess: invalidate });
}

export function useApplyHeroImage(setId: string) {
  const invalidate = useInvalidateSet(setId);
  return useMutation({ mutationFn: (id: string) => applyHeroImage(id), onSuccess: invalidate });
}

export function useDeleteHeroImage(setId: string) {
  const invalidate = useInvalidateSet(setId);
  return useMutation({ mutationFn: (id: string) => deleteHeroImage(id), onSuccess: invalidate });
}

export function useDeleteHeroImageSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHeroImageSet(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.sets }),
  });
}
