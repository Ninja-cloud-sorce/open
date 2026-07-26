"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listInspirationItems,
  uploadInspirationItem,
  runCategorization,
  createUrlOrNoteItem,
  updateInspirationItem,
  deleteInspirationItem,
  listCollections,
  createCollection,
  listInspirationSources,
  createInspirationSource,
  deleteInspirationSource,
} from "@/features/inspiration/actions";
import type { InspirationFilters } from "@/features/inspiration/types";

const keys = {
  items: (filters: InspirationFilters) => ["inspiration-items", filters] as const,
  collections: ["inspiration-collections"] as const,
  sources: ["inspiration-sources"] as const,
};

export function useInspirationItems(filters: InspirationFilters) {
  return useQuery({
    queryKey: keys.items(filters),
    queryFn: () => listInspirationItems(filters),
  });
}

export function useCollections() {
  return useQuery({ queryKey: keys.collections, queryFn: listCollections });
}

export function useInspirationSources() {
  return useQuery({ queryKey: keys.sources, queryFn: listInspirationSources });
}

function useInvalidateItems() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["inspiration-items"] });
}

export function useUploadInspirationItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: (formData: FormData) => uploadInspirationItem(formData),
    onSuccess: invalidate,
  });
}

export function useRunCategorization() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: (itemId: string) => runCategorization(itemId),
    onSuccess: invalidate,
  });
}

export function useCreateUrlOrNoteItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: (input: Parameters<typeof createUrlOrNoteItem>[0]) => createUrlOrNoteItem(input),
    onSuccess: invalidate,
  });
}

export function useUpdateInspirationItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateInspirationItem>[1] }) =>
      updateInspirationItem(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteInspirationItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: (id: string) => deleteInspirationItem(id),
    onSuccess: invalidate,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createCollection(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.collections }),
  });
}

export function useCreateInspirationSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, url }: { name: string; url: string }) => createInspirationSource(name, url),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.sources }),
  });
}

export function useDeleteInspirationSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInspirationSource(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.sources }),
  });
}
