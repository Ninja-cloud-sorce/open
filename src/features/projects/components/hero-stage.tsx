"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkle, Lightbulb, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  suggestSubjectForProject,
  createHeroSetForProject,
  listHeroSetsForProject,
} from "@/features/hero-images/project-actions";

export function HeroStage({ projectId, projectName }: { projectId: string; projectName: string }) {
  void projectName;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");

  const { data: existingSets = [] } = useQuery({
    queryKey: ["project-hero-sets", projectId],
    queryFn: () => listHeroSetsForProject(projectId),
  });

  const suggest = useMutation({
    mutationFn: () => suggestSubjectForProject(projectId),
    onSuccess: (text) => {
      if (text) setSubject(text);
      else toast.info("No suggestion available — describe it in your own words.");
    },
  });

  const create = useMutation({
    mutationFn: () => createHeroSetForProject(projectId, subject.trim()),
    onSuccess: (set) => {
      queryClient.invalidateQueries({ queryKey: ["project-hero-sets", projectId] });
      router.push(`/hero-images/${set.id}`);
    },
  });

  return (
    <section className="space-y-4 border-t border-border pt-8">
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Stage 05</p>
        <h3 className="font-heading text-xl tracking-tight text-foreground">Hero image</h3>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          What should the hero image actually show? Describe it in your own words — this leads the generation, and
          the four concepts explore different angles on it.
        </p>
      </div>

      <div className="max-w-2xl space-y-3">
        <Textarea
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="e.g. a calm sunlit consultation room with a doctor and patient talking, shot from the doorway"
          rows={3}
          className="text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => create.mutate()}
            disabled={!subject.trim() || create.isPending}
          >
            <Sparkle size={13} />
            {create.isPending ? "Generating…" : "Generate hero concepts"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs"
            onClick={() => suggest.mutate()}
            disabled={suggest.isPending}
          >
            <Lightbulb size={13} />
            {suggest.isPending ? "Thinking…" : "Suggest from brief"}
          </Button>
        </div>
      </div>

      {existingSets.length > 0 && (
        <div className="max-w-2xl space-y-1.5 pt-2">
          {existingSets.map((set) => (
            <Link
              key={set.id}
              href={`/hero-images/${set.id}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors duration-fast hover:border-foreground/25"
            >
              <span className="truncate text-muted-foreground">{set.subjectPrompt || set.title}</span>
              <ArrowRight size={13} className="shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
