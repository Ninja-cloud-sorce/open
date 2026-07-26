"use client";

import { motion } from "motion/react";
import { Star, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { VariantFrame } from "@/features/projects/components/variant-frame";
import type { VariantDTO } from "@/features/projects/types";

/** Tiny swatch row so each direction's palette reads at a glance without opening it. */
function TokenSwatches({ variant }: { variant: VariantDTO }) {
  const t = variant.designTokens;
  if (!t) return null;
  const swatches = [t.colorBg, t.colorSurface, t.colorText, t.colorAccent].filter(Boolean) as string[];
  return (
    <div className="flex gap-1">
      {swatches.map((hex, i) => (
        <span
          key={`${hex}-${i}`}
          className="size-2.5 rounded-full ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  );
}

export function VariantCard({
  variant,
  index,
  onOpen,
  onSelect,
  onFavorite,
}: {
  variant: VariantDTO;
  index: number;
  onOpen: () => void;
  onSelect: () => void;
  onFavorite: () => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-colors duration-base",
        variant.selected ? "border-brand" : "border-border hover:border-foreground/25"
      )}
    >
      <div className="relative h-52 overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 origin-top-left scale-[0.5] [width:200%] [height:200%]">
          <VariantFrame variant={variant} />
        </div>
        <button
          onClick={onOpen}
          aria-label={`Open ${variant.styleName}`}
          className="absolute inset-0 bg-foreground/0 transition-colors duration-fast hover:bg-foreground/[0.04]"
        />
      </div>

      <div className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">{variant.label}</span>
            <TokenSwatches variant={variant} />
          </div>
          <h3 className="truncate font-heading text-sm text-foreground">{variant.styleName}</h3>
          {variant.rationale && (
            <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{variant.rationale}</p>
          )}
        </div>

        <button
          onClick={onFavorite}
          aria-label="Favorite"
          className="shrink-0 text-muted-foreground transition-colors duration-fast hover:text-brand"
        >
          <Star size={13} weight={variant.favorite ? "fill" : "regular"} className={cn(variant.favorite && "text-brand")} />
        </button>
      </div>

      <button
        onClick={onSelect}
        disabled={variant.status !== "DONE"}
        className={cn(
          "flex items-center justify-between border-t border-border px-3 py-2 text-[11px] font-medium transition-colors duration-fast disabled:opacity-40",
          variant.selected ? "bg-brand text-brand-foreground" : "text-foreground hover:bg-muted"
        )}
      >
        {variant.selected ? "Chosen direction" : "Take this direction"}
        <ArrowRight size={12} />
      </button>
    </motion.article>
  );
}
