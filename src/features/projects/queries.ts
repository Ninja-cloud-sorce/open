"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  startRound,
  runRoundGeneration,
  selectVariant,
  runFullSiteGeneration,
  toggleVariantFavorite,
} from "@/features/projects/actions";
import type { ProjectDTO, ProjectInput } from "@/features/projects/types";

const keys = {
  projects: ["projects"] as const,
  project: (id: string) => ["project", id] as const,
};

export function useProjects() {
  return useQuery({ queryKey: keys.projects, queryFn: listProjects });
}

/** How often to re-read a project while any of its variants is still building. */
const IN_FLIGHT_POLL_MS = 4000;

/**
 * Generating a round is one server action that awaits all ten variants, so its
 * mutation does not settle for several minutes. Meanwhile `generateRound`
 * commits each site to the database the moment it finishes.
 *
 * Without polling the browser never asks for those rows, so both panes sat on
 * spinners while completed work was already stored — and because lanes run
 * sequentially, the second lane appeared broken for the whole run. Poll while
 * anything is in flight, and stop as soon as nothing is.
 */
export function useProject(id: string | null) {
  return useQuery({
    queryKey: keys.project(id ?? ""),
    // Fetched over HTTP rather than as a Server Action: actions are serialised
    // per client, so a poll would queue behind the running round generation and
    // never report progress.
    queryFn: async (): Promise<ProjectDTO | null> => {
      const response = await fetch(`/api/projects/${id}`, { cache: "no-store" });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Could not load project.");
      return response.json();
    },
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const project = query.state.data;
      if (!project) return false;
      const building = project.rounds.some((round) =>
        round.variants.some((v) => v.status === "PENDING" || v.status === "GENERATING")
      );
      return building ? IN_FLIGHT_POLL_MS : false;
    },
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
