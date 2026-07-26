"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  startRound,
  runRoundGeneration,
  selectVariant,
  runFullSiteGeneration,
  toggleVariantFavorite,
} from "@/features/projects/actions";
import type { ProjectInput } from "@/features/projects/types";

const keys = {
  projects: ["projects"] as const,
  project: (id: string) => ["project", id] as const,
};

export function useProjects() {
  return useQuery({ queryKey: keys.projects, queryFn: listProjects });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: keys.project(id ?? ""),
    queryFn: () => getProject(id!),
    enabled: Boolean(id),
  });
}

function useInvalidate(projectId?: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: keys.projects });
    if (projectId) queryClient.invalidateQueries({ queryKey: keys.project(projectId) });
    else queryClient.invalidateQueries({ queryKey: ["project"] });
  };
}

export function useCreateProject() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (input: ProjectInput) => createProject(input), onSuccess: invalidate });
}

export function useUpdateProject(projectId: string) {
  const invalidate = useInvalidate(projectId);
  return useMutation({
    mutationFn: (input: Partial<ProjectInput>) => updateProject(projectId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteProject() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => deleteProject(id), onSuccess: invalidate });
}

export function useStartRound(projectId: string) {
  const invalidate = useInvalidate(projectId);
  return useMutation({
    mutationFn: (parentVariantId?: string) => startRound(projectId, parentVariantId),
    onSuccess: invalidate,
  });
}

export function useRunRoundGeneration(projectId: string) {
  const invalidate = useInvalidate(projectId);
  return useMutation({ mutationFn: (roundId: string) => runRoundGeneration(roundId), onSuccess: invalidate });
}

export function useSelectVariant(projectId: string) {
  const invalidate = useInvalidate(projectId);
  return useMutation({ mutationFn: (variantId: string) => selectVariant(variantId), onSuccess: invalidate });
}

export function useRunFullSiteGeneration(projectId: string) {
  const invalidate = useInvalidate(projectId);
  return useMutation({
    mutationFn: (variantId: string) => runFullSiteGeneration(variantId),
    onSuccess: invalidate,
  });
}

export function useToggleVariantFavorite(projectId: string) {
  const invalidate = useInvalidate(projectId);
  return useMutation({ mutationFn: (variantId: string) => toggleVariantFavorite(variantId), onSuccess: invalidate });
}
