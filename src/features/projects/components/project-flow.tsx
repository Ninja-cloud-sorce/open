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

/** The side a pick lands on is decided by its rulebook, never by click order:
 *  Impeccable is always the left pane, Taste-Skill V2 always the right. */
interface Pair {
  left: string | null;
  right: string | null;
}

const EMPTY_PAIR: Pair = { left: null, right: null };

/** An explicit pick wins; otherwise show the first direction from each rulebook.
 *  A pick belonging to another round falls through to that default. */
function resolvePair(round: VariantRoundDTO | null, pair: Pair) {
  if (!round) return { left: null, right: null };
  const pick = (id: string | null, lane: "IMPECCABLE" | "TASTE_SKILL") => {
    const chosen = id ? round.variants.find((v) => v.id === id && v.lane === lane) : null;
    return chosen ?? round.variants.find((v) => v.lane === lane) ?? null;
  };
  return { left: pick(pair.left, "IMPECCABLE"), right: pick(pair.right, "TASTE_SKILL") };
}

export function ProjectFlow({ projectId }: { projectId: string }) {
  const { data: project, isLoading } = useProject(projectId);
  const startRound = useStartRound(projectId);
  const runRound = useRunRoundGeneration(projectId);
  const selectVariant = useSelectVariant(projectId);
  const runFullSite = useRunFullSiteGeneration(projectId);
  const toggleFavorite = useToggleVariantFavorite(projectId);

  const [roundId, setRoundId] = useState<string | null>(null);
  const [pair, setPair] = useState<Pair>(EMPTY_PAIR);
  const [mode, setMode] = useState<"compare" | "hero">("compare");

  const busy = startRound.isPending || runRound.isPending || runFullSite.isPending;

  const rounds = project?.rounds ?? [];
  const activeRound: VariantRoundDTO | null =
    rounds.find((r) => r.id === roundId) ?? rounds[rounds.length - 1] ?? null;

  // Which variant each pane shows is derived, not stored: an explicit pick wins,
  // otherwise fall back to one direction per rulebook so the split is never empty.
  const { left, right } = resolvePair(activeRound, pair);

  if (isLoading || !project) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const anyFullSite = rounds.some((r) => r.variants.some((v) => v.fullSiteHtml));

  function handlePick(variantId: string) {
    const variant = activeRound?.variants.find((v) => v.id === variantId);
    if (!variant) return;
    setPair((prev) =>
      variant.lane === "IMPECCABLE" ? { ...prev, left: variantId } : { ...prev, right: variantId }
    );
  }

  async function handleFirstRound() {
    const { roundId: created } = await startRound.mutateAsync(undefined);
    setRoundId(created);
    await runRound.mutateAsync(created);
    toast.success("Directions ready.");
  }

  async function handleNextRound(variantId: string) {
    const { roundId: created } = await startRound.mutateAsync(variantId);
    setRoundId(created);
    setPair(EMPTY_PAIR);
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
          onRoundChange={(id) => {
            setRoundId(id);
            setPair(EMPTY_PAIR);
          }}
          leftId={left?.id ?? null}
          rightId={right?.id ?? null}
          onPick={handlePick}
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
