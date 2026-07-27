"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowsClockwise, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VariantBar } from "@/features/projects/components/variant-bar";
import { ComparePane } from "@/features/projects/components/compare-pane";
import { HeroStage } from "@/features/projects/components/hero-stage";
import type { VariantRoundDTO } from "@/features/projects/types";
import {
  useProject,
  useStartRound,
  useRunRoundGeneration,
  useSelectVariant,
  useRunFullSiteGeneration,
  useToggleVariantFavorite,
} from "@/features/projects/queries";

/** The two panes are the same design language read by each rulebook. Variants
 *  pair on `order`, which is the collection index. */
function resolvePair(round: VariantRoundDTO | null, index: number) {
  if (!round) return { left: null, right: null };
  const at = (lane: "IMPECCABLE" | "TASTE_SKILL") =>
    round.variants.find((v) => v.lane === lane && v.order === index) ?? null;
  return { left: at("IMPECCABLE"), right: at("TASTE_SKILL") };
}

export function ProjectFlow({ projectId }: { projectId: string }) {
  const { data: project, isLoading } = useProject(projectId);
  const startRound = useStartRound(projectId);
  const runRound = useRunRoundGeneration(projectId);
  const selectVariant = useSelectVariant(projectId);
  const runFullSite = useRunFullSiteGeneration(projectId);
  const toggleFavorite = useToggleVariantFavorite(projectId);

  const [roundId, setRoundId] = useState<string | null>(null);
  const [collectionIndex, setCollectionIndex] = useState(0);
  const [mode, setMode] = useState<"compare" | "hero">("compare");

  const busy = startRound.isPending || runRound.isPending || runFullSite.isPending;

  const rounds = project?.rounds ?? [];
  const activeRound: VariantRoundDTO | null =
    rounds.find((r) => r.id === roundId) ?? rounds[rounds.length - 1] ?? null;

  const { left, right } = resolvePair(activeRound, collectionIndex);

  if (isLoading || !project) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const anyFullSite = rounds.some((r) => r.variants.some((v) => v.fullSiteHtml));

  async function handleFirstRound() {
    const { roundId: created } = await startRound.mutateAsync(undefined);
    setRoundId(created);
    await runRound.mutateAsync(created);
    toast.success("Directions ready.");
  }

  async function handleNextRound(variantId: string) {
    const { roundId: created } = await startRound.mutateAsync(variantId);
    setRoundId(created);
    await runRound.mutateAsync(created);
    toast.success("Refinements ready.");
  }

  async function handleRegenerate() {
    if (!activeRound) return;
    await runRound.mutateAsync(activeRound.id);
  }

  async function handleFullSite(variantId: string) {
    toast.info("Polishing this direction - this takes a few minutes.");
    await runFullSite.mutateAsync(variantId);
    toast.success("Polished build ready.");
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2">
        <Link href="/projects" className="text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="min-w-0 truncate font-heading text-sm tracking-tight text-foreground">{project.name}</h1>
        {project.serviceType && (
          <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:inline">
            {project.serviceType}
          </span>
        )}
        {activeRound && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto shrink-0 gap-1.5 text-xs"
            onClick={handleRegenerate}
            disabled={busy}
          >
            <ArrowsClockwise size={12} />
            {busy ? "Generating…" : "Regenerate"}
          </Button>
        )}
      </header>

      {activeRound && (
        <VariantBar
          rounds={rounds}
          activeRound={activeRound}
          onRoundChange={setRoundId}
          activeIndex={collectionIndex}
          onIndexChange={setCollectionIndex}
          mode={mode}
          onModeChange={setMode}
          canHero={anyFullSite}
        />
      )}

      {!activeRound ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-md space-y-4 text-center">
            <h2 className="font-heading text-2xl tracking-tight text-foreground">Generate ten directions</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Five under the Impeccable rulebook, five under Taste-Skill V2 — same brief, two different design
              philosophies. Put any two side by side and keep the one worth pursuing.
            </p>
            <Button onClick={handleFirstRound} disabled={busy} className="gap-1.5">
              <Sparkle size={14} />
              {busy ? "Generating…" : "Generate directions"}
            </Button>
          </div>
        </div>
      ) : mode === "hero" ? (
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-3xl">
            <HeroStage projectId={projectId} projectName={project.name} />
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-2 gap-px bg-border lg:grid-cols-2 lg:grid-rows-1">
          <div className="min-h-0 min-w-0 bg-background">
            <ComparePane
              variant={left}
              side="L"
              busy={busy}
              onSelect={(id) => selectVariant.mutate(id)}
              onFavorite={(id) => toggleFavorite.mutate(id)}
              onNextRound={handleNextRound}
              onExpandFullSite={handleFullSite}
            />
          </div>
          <div className="min-h-0 min-w-0 bg-background">
            <ComparePane
              variant={right}
              side="R"
              busy={busy}
              onSelect={(id) => selectVariant.mutate(id)}
              onFavorite={(id) => toggleFavorite.mutate(id)}
              onNextRound={handleNextRound}
              onExpandFullSite={handleFullSite}
            />
          </div>
        </div>
      )}
    </div>
  );
}
