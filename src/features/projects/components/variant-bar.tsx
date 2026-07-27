"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { DesignLane } from "@/generated/prisma/enums";
import type { VariantDTO, VariantRoundDTO } from "@/features/projects/types";

const LANE_LABEL: Record<DesignLane, string> = {
  IMPECCABLE: "Impeccable",
  TASTE_SKILL: "Taste-Skill V2",
};

const LANE_ORDER: DesignLane[] = ["IMPECCABLE", "TASTE_SKILL"];

/** 1…9 then 0, matching how the chips read left to right. */
const HOTKEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

function Chip({
  variant,
  hotkey,
  side,
  onPick,
}: {
  variant: VariantDTO;
  hotkey: string | undefined;
  side: "L" | "R" | null;
  onPick: () => void;
}) {
  const pending = variant.status === "PENDING" || variant.status === "GENERATING";
  const failed = variant.status === "ERROR";

  return (
    <button
      onClick={onPick}
      title={variant.styleName}
      className={cn(
        "group relative flex shrink-0 items-center gap-2 rounded-sm px-2.5 py-1.5 font-mono text-[11px] tracking-[0.12em] transition-colors duration-fast",
        side ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {side && (
        <motion.span
          layoutId="variant-chip-active"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-sm border border-brand/50 bg-brand/10"
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {pending && <span className="size-1 animate-pulse rounded-full bg-muted-foreground" />}
        {failed && <span className="size-1 rounded-full bg-destructive" />}
        {variant.label}
      </span>
      {side ? (
        <span className="relative z-10 rounded-[2px] bg-brand px-1 text-[9px] leading-[1.4] text-brand-foreground">
          {side}
        </span>
      ) : (
        hotkey && (
          <span className="relative z-10 text-[9px] text-muted-foreground/40 group-hover:text-muted-foreground/70">
            {hotkey}
          </span>
        )
      )}
    </button>
  );
}

/**
 * The one control surface for the round: every direction as a chip, grouped by
 * rulebook. Picking a chip drops it into whichever pane was not filled last, so
 * two clicks always give you a fresh comparison.
 */
export function VariantBar({
  rounds,
  activeRound,
  onRoundChange,
  leftId,
  rightId,
  onPick,
  mode,
  onModeChange,
  canHero,
}: {
  rounds: VariantRoundDTO[];
  activeRound: VariantRoundDTO;
  onRoundChange: (roundId: string) => void;
  leftId: string | null;
  rightId: string | null;
  onPick: (variantId: string) => void;
  mode: "compare" | "hero";
  onModeChange: (mode: "compare" | "hero") => void;
  canHero: boolean;
}) {
  const ordered = LANE_ORDER.flatMap((lane) => activeRound.variants.filter((v) => v.lane === lane));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      const index = HOTKEYS.indexOf(event.key);
      const variant = index >= 0 ? ordered[index] : undefined;
      if (variant) {
        event.preventDefault();
        onPick(variant.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ordered, onPick]);

  const leftLane = ordered.find((v) => v.id === leftId)?.lane;
  const rightLane = ordered.find((v) => v.id === rightId)?.lane;

  return (
    <div className="flex items-center gap-3 overflow-x-auto border-b border-border px-4 py-1.5">
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

      {LANE_ORDER.map((lane, laneIndex) => {
        const laneVariants = activeRound.variants.filter((v) => v.lane === lane);
        if (laneVariants.length === 0) return null;
        return (
          <div
            key={lane}
            className={cn(
              "flex shrink-0 items-center gap-0.5",
              laneIndex > 0 && "border-l border-border pl-3"
            )}
          >
            {laneVariants.map((variant) => (
              <Chip
                key={variant.id}
                variant={variant}
                hotkey={HOTKEYS[ordered.indexOf(variant)]}
                side={variant.id === leftId ? "L" : variant.id === rightId ? "R" : null}
                onPick={() => onPick(variant.id)}
              />
            ))}
          </div>
        );
      })}

      <div className="ml-auto flex shrink-0 items-center gap-3 pl-3">
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 xl:inline">
          {leftLane ? `Left ${LANE_LABEL[leftLane]}` : "Left —"}
          {" · "}
          {rightLane ? `Right ${LANE_LABEL[rightLane]}` : "Right —"}
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
