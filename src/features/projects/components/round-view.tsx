"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowsClockwise, Layout, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VariantCard } from "@/features/projects/components/variant-card";
import { VariantFrame } from "@/features/projects/components/variant-frame";
import type { DesignLane } from "@/generated/prisma/enums";
import type { VariantRoundDTO } from "@/features/projects/types";

const LANE_META: Record<DesignLane, { label: string; blurb: string }> = {
  IMPECCABLE: { label: "Impeccable", blurb: "Craft-floor rulebook" },
  TASTE_SKILL: { label: "Taste-Skill V2", blurb: "Anti-slop rulebook" },
};

export function RoundView({
  round,
  projectId,
  onOpen,
  onSelect,
  onFavorite,
  onNextRound,
  onExpandFullSite,
  onRegenerate,
  busy,
}: {
  round: VariantRoundDTO;
  projectId: string;
  onOpen: (variantId: string) => void;
  onSelect: (variantId: string) => void;
  onFavorite: (variantId: string) => void;
  onNextRound: (variantId: string) => void;
  onExpandFullSite: (variantId: string) => void;
  onRegenerate: () => void;
  busy: boolean;
}) {
  void projectId;
  const chosen = round.variants.find((v) => v.selected) ?? null;
  const lanes = Array.from(new Set(round.variants.map((v) => v.lane)));
  const twoLane = lanes.length > 1;

  // Once a direction is taken, the field collapses to just the winner.
  if (chosen) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="chosen"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
            <div className="space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand">
                Round {round.roundNumber} · chosen
              </p>
              <h3 className="font-heading text-xl tracking-tight text-foreground">{chosen.styleName}</h3>
              {chosen.rationale && (
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{chosen.rationale}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNextRound(chosen.id)} disabled={busy}>
                <Sparkle size={13} />
                Refine further
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => onExpandFullSite(chosen.id)} disabled={busy}>
                <Layout size={13} />
                {chosen.fullSiteHtml ? "Rebuild full site" : "Build full site"}
              </Button>
            </div>
          </div>

          <div className="h-[70vh] overflow-hidden rounded-lg border border-border">
            <VariantFrame variant={chosen} full={Boolean(chosen.fullSiteHtml)} />
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Round {round.roundNumber}
          </p>
          <h3 className="font-heading text-lg tracking-tight text-foreground">
            {round.parentStyleName ? `Refining “${round.parentStyleName}”` : "Two rulebooks, ten directions"}
          </h3>
        </div>
        <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={onRegenerate} disabled={busy}>
          <ArrowsClockwise size={12} />
          {busy ? "Generating…" : "Regenerate round"}
        </Button>
      </div>

      <div className={cn("grid gap-5", twoLane && "lg:grid-cols-2")}>
        {lanes.map((lane) => {
          const laneVariants = round.variants.filter((v) => v.lane === lane);
          return (
            <section key={lane} className="space-y-3">
              <header className="flex items-baseline justify-between border-b border-border pb-2">
                <h4 className="font-heading text-sm tracking-tight text-foreground">{LANE_META[lane].label}</h4>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {LANE_META[lane].blurb}
                </span>
              </header>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {laneVariants.map((variant, index) => (
                  <VariantCard
                    key={variant.id}
                    variant={variant}
                    index={index}
                    onOpen={() => onOpen(variant.id)}
                    onSelect={() => onSelect(variant.id)}
                    onFavorite={() => onFavorite(variant.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
