"use client";

import { useState } from "react";
import { Star, ArrowRight, Layout, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { VariantFrame } from "@/features/projects/components/variant-frame";
import type { DesignLane } from "@/generated/prisma/enums";
import type { VariantDTO } from "@/features/projects/types";

const LANE_LABEL: Record<DesignLane, string> = {
  IMPECCABLE: "Impeccable",
  TASTE_SKILL: "Taste-Skill V2",
};

function Swatches({ variant }: { variant: VariantDTO }) {
  const t = variant.designTokens;
  if (!t) return null;
  const hexes = [t.colorBg, t.colorSurface, t.colorText, t.colorAccent].filter(Boolean) as string[];
  return (
    <div className="flex shrink-0 gap-1">
      {hexes.map((hex, i) => (
        <span
          key={`${hex}-${i}`}
          className="size-2 rounded-full ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  );
}

export function ComparePane({
  variant,
  side,
  busy,
  onSelect,
  onFavorite,
  onNextRound,
  onExpandFullSite,
}: {
  variant: VariantDTO | null;
  side: "L" | "R";
  busy: boolean;
  onSelect: (variantId: string) => void;
  onFavorite: (variantId: string) => void;
  onNextRound: (variantId: string) => void;
  onExpandFullSite: (variantId: string) => void;
}) {
  // Full site is the richer view, so default to it the moment one exists.
  const [showFull, setShowFull] = useState(true);

  if (!variant) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/10 px-6 text-center">
        <p className="max-w-56 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground/60">
          Pick a direction above for the {side === "L" ? "left" : "right"} pane
        </p>
      </div>
    );
  }

  const hasFull = Boolean(variant.fullSiteHtml);
  const full = hasFull && showFull;

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand">{variant.label}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading text-sm tracking-tight text-foreground">{variant.styleName}</h3>
        </div>
        <Swatches variant={variant} />
        <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground lg:inline">
          {LANE_LABEL[variant.lane]}
        </span>
        <button
          onClick={() => onFavorite(variant.id)}
          aria-label={variant.favorite ? "Unfavorite" : "Favorite"}
          className="shrink-0 text-muted-foreground transition-colors duration-fast hover:text-brand"
        >
          <Star size={13} weight={variant.favorite ? "fill" : "regular"} className={cn(variant.favorite && "text-brand")} />
        </button>
      </header>

      <div className="min-h-0 flex-1 bg-white">
        <VariantFrame variant={variant} full={full} />
      </div>

      <footer className="flex shrink-0 flex-wrap items-center gap-px border-t border-border bg-border/60">
        {hasFull && (
          <button
            onClick={() => setShowFull((v) => !v)}
            className="bg-background px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors duration-fast hover:text-foreground"
          >
            {full ? "Preview" : "Full site"}
          </button>
        )}
        <button
          onClick={() => onSelect(variant.id)}
          disabled={variant.status !== "DONE"}
          className={cn(
            "flex flex-1 items-center justify-between gap-2 px-3 py-2 text-[11px] font-medium transition-colors duration-fast disabled:opacity-40",
            variant.selected ? "bg-brand text-brand-foreground" : "bg-background text-foreground hover:bg-muted"
          )}
        >
          {variant.selected ? "Chosen direction" : "Take this direction"}
          <ArrowRight size={12} />
        </button>
        <button
          onClick={() => onNextRound(variant.id)}
          disabled={busy || variant.status !== "DONE"}
          title="Generate five more in this design language"
          className="flex items-center gap-1.5 bg-background px-3 py-2 text-[11px] text-muted-foreground transition-colors duration-fast hover:text-foreground disabled:opacity-40"
        >
          <Sparkle size={12} />
          Refine
        </button>
        <button
          onClick={() => onExpandFullSite(variant.id)}
          disabled={busy || variant.status !== "DONE"}
          className="flex items-center gap-1.5 bg-background px-3 py-2 text-[11px] text-muted-foreground transition-colors duration-fast hover:text-foreground disabled:opacity-40"
        >
          <Layout size={12} />
          {hasFull ? "Rebuild" : "Build site"}
        </button>
      </footer>
    </div>
  );
}
