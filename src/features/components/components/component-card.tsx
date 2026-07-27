"use client";

import { motion } from "motion/react";
import { Star } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ComponentFrame } from "@/features/components/components/component-frame";
import type { ComponentDTO } from "@/features/components/types";

export function ComponentCard({
  component,
  index,
  onOpen,
  onFavorite,
}: {
  component: ComponentDTO;
  index: number;
  onOpen: () => void;
  onFavorite: () => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors duration-base hover:border-foreground/25"
    >
      <div className="relative h-44 overflow-hidden border-b border-border bg-white">
        {/* Scaled down so a full-width section reads as a thumbnail. */}
        <div className="pointer-events-none absolute inset-0 origin-top-left scale-[0.34] [height:294%] [width:294%]">
          <ComponentFrame html={component.html} css={component.css} title={component.name} />
        </div>
        {/* Iframes swallow clicks, so the hit target sits above the preview. */}
        <button
          onClick={onOpen}
          aria-label={`Open ${component.name}`}
          className="absolute inset-0 bg-foreground/0 transition-colors duration-fast hover:bg-foreground/[0.04]"
        />
      </div>

      <div className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0 space-y-1.5">
          <h3 className="truncate font-heading text-sm tracking-tight text-foreground">{component.name}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {component.category}
            </Badge>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
              {component.source === "EXTRACTED" ? component.variantLabel ?? "extracted" : "generated"}
            </span>
          </div>
        </div>
        <button
          onClick={onFavorite}
          aria-label="Favorite"
          className="shrink-0 text-muted-foreground transition-colors duration-fast hover:text-brand"
        >
          <Star size={13} weight={component.favorite ? "fill" : "regular"} className={cn(component.favorite && "text-brand")} />
        </button>
      </div>
    </motion.article>
  );
}
