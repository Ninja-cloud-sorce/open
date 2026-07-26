"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Sparkle, X } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StageRail } from "@/features/projects/components/stage-rail";
import { RoundView } from "@/features/projects/components/round-view";
import { VariantFrame } from "@/features/projects/components/variant-frame";
import { HeroStage } from "@/features/projects/components/hero-stage";
import {
  useProject,
  useStartRound,
  useRunRoundGeneration,
  useSelectVariant,
  useRunFullSiteGeneration,
  useToggleVariantFavorite,
} from "@/features/projects/queries";

export function ProjectFlow({ projectId }: { projectId: string }) {
  const { data: project, isLoading } = useProject(projectId);
  const startRound = useStartRound(projectId);
  const runRound = useRunRoundGeneration(projectId);
  const selectVariant = useSelectVariant(projectId);
  const runFullSite = useRunFullSiteGeneration(projectId);
  const toggleFavorite = useToggleVariantFavorite(projectId);
  const [openVariantId, setOpenVariantId] = useState<string | null>(null);

  const busy = startRound.isPending || runRound.isPending || runFullSite.isPending;

  if (isLoading || !project) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const rounds = project.rounds;
  const latestRound = rounds[rounds.length - 1] ?? null;
  const chosenOverall = rounds.flatMap((r) => r.variants).find((v) => v.selected && v.fullSiteHtml);
  const allVariants = rounds.flatMap((r) => r.variants);
  const openVariant = allVariants.find((v) => v.id === openVariantId) ?? null;

  async function handleFirstRound() {
    const { roundId } = await startRound.mutateAsync(undefined);
    await runRound.mutateAsync(roundId);
    toast.success("Directions ready.");
  }

  async function handleNextRound(variantId: string) {
    const { roundId } = await startRound.mutateAsync(variantId);
    await runRound.mutateAsync(roundId);
    toast.success("Refinements ready.");
  }

  async function handleRegenerate() {
    if (!latestRound) return;
    await runRound.mutateAsync(latestRound.id);
  }

  async function handleFullSite(variantId: string) {
    toast.info("Building the full site — this takes a minute.");
    await runFullSite.mutateAsync(variantId);
    toast.success("Full site built.");
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border px-6 py-3">
        <Link href="/projects" className="text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-heading text-sm tracking-tight text-foreground">{project.name}</h1>
          {project.serviceType && (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {project.serviceType}
            </p>
          )}
        </div>
      </header>

      <StageRail
        hasRounds={rounds.length > 0}
        hasChosen={rounds.some((r) => r.variants.some((v) => v.selected))}
        hasFullSite={Boolean(chosenOverall)}
      />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {rounds.length === 0 ? (
          <div className="mx-auto max-w-md space-y-4 py-16 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Stage 02</p>
            <h2 className="font-heading text-2xl tracking-tight text-foreground">Generate ten directions</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Five under the Impeccable rulebook, five under Taste-Skill V2 — same brief, two different design
              philosophies. Pick the one worth pursuing and the rest step aside.
            </p>
            <Button onClick={handleFirstRound} disabled={busy} className="gap-1.5">
              <Sparkle size={14} />
              {busy ? "Generating…" : "Generate directions"}
            </Button>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl space-y-12">
            {rounds.map((round) => (
              <RoundView
                key={round.id}
                round={round}
                projectId={projectId}
                busy={busy}
                onOpen={setOpenVariantId}
                onSelect={(id) => selectVariant.mutate(id)}
                onFavorite={(id) => toggleFavorite.mutate(id)}
                onNextRound={handleNextRound}
                onExpandFullSite={handleFullSite}
                onRegenerate={handleRegenerate}
              />
            ))}

            {chosenOverall && <HeroStage projectId={projectId} projectName={project.name} />}
          </div>
        )}
      </div>

      {openVariant && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">{openVariant.label}</span>
              <h2 className="font-heading text-sm text-foreground">{openVariant.styleName}</h2>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={() => setOpenVariantId(null)} aria-label="Close preview">
              <X size={15} />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <VariantFrame variant={openVariant} full={Boolean(openVariant.fullSiteHtml)} />
          </div>
        </div>
      )}
    </div>
  );
}
