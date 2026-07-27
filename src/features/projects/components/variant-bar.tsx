"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { COLLECTIONS } from "@/features/variants/collections";
import type { VariantRoundDTO } from "@/features/projects/types";

/**
 * One button per design language. Picking one puts the Impeccable reading of it
 * in the left pane and the Taste-Skill reading in the right, so the split is
 * always the same brief answered two ways.
 */
export function VariantBar({
  rounds,
  activeRound,
  onRoundChange,
  activeIndex,
  onIndexChange,
  mode,
  onModeChange,
  canHero,
}: {
  rounds: VariantRoundDTO[];
  activeRound: VariantRoundDTO;
  onRoundChange: (roundId: string) => void;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  mode: "compare" | "hero";
  onModeChange: (mode: "compare" | "hero") => void;
  canHero: boolean;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < COLLECTIONS.length) {
        event.preventDefault();
        onIndexChange(index);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onIndexChange]);

  return (
    <div className="flex items-center gap-3 overflow-x-auto border-b border-border px-4 py-1.5">
      <span className="hidden shrink-0 font-mono text-[10px] uppercase leading-tight tracking-[0.16em] text-muted-foreground/60 sm:inline">
        Collection
      </span>

      {rounds.length > 1 && (
        <div className="flex shrink-0 items-center gap-1 border-r border-border pr-3">
          {rounds.map((round) => (
            <button
              key={round.id}
              onClick={() => onRoundChange(round.id)}
              className={cn(
                "rounded-sm px-1.5 py-1 font-mono text-[10px] tracking-[0.14em] transition-colors duration-fast",
                round.id === activeRound.id
                  ? "text-foreground"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              R{round.roundNumber}
            </button>
          ))}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1">
        {COLLECTIONS.map((collection, index) => {
          const active = index === activeIndex;
          // Both lanes have to be ready before the pair is worth looking at.
          const ready = activeRound.variants.filter(
            (v) => v.order === index && v.status === "DONE"
          ).length;
          return (
            <button
              key={collection.id}
              onClick={() => onIndexChange(index)}
              title={collection.brief}
              className={cn(
                "group relative shrink-0 rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors duration-fast",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="collection-active"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-sm border border-brand/50 bg-brand/10"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {ready < 2 && (
                  <span
                    className={cn(
                      "size-1 rounded-full",
                      ready === 0 ? "animate-pulse bg-muted-foreground/50" : "bg-brand/60"
                    )}
                  />
                )}
                {collection.name}
                <span className="text-[9px] text-muted-foreground/40">{index + 1}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3 pl-3">
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 xl:inline">
          Left = Impeccable · Right = Taste-Skill V2 · Keys 1-5
        </span>
        {canHero && (
          <button
            onClick={() => onModeChange(mode === "hero" ? "compare" : "hero")}
            className={cn(
              "rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-fast",
              mode === "hero"
                ? "border-brand/50 bg-brand/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            Hero image
          </button>
        )}
      </div>
    </div>
  );
}
