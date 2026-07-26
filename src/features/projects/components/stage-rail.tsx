"use client";

import { cn } from "@/lib/utils";

const STAGES = [
  { n: "01", label: "Brief" },
  { n: "02", label: "Directions" },
  { n: "03", label: "Narrow" },
  { n: "04", label: "Full site" },
  { n: "05", label: "Hero image" },
];

/** Horizontal progress rail so each stage of the flow is legible at a glance. */
export function StageRail({
  hasRounds,
  hasChosen,
  hasFullSite,
}: {
  hasRounds: boolean;
  hasChosen: boolean;
  hasFullSite: boolean;
}) {
  const activeIndex = hasFullSite ? 4 : hasChosen ? 3 : hasRounds ? 2 : 1;

  return (
    <nav className="flex items-stretch gap-px overflow-x-auto border-b border-border bg-border/60">
      {STAGES.map((stage, index) => {
        const done = index < activeIndex;
        const current = index === activeIndex - 1;
        return (
          <div
            key={stage.n}
            className={cn(
              "flex min-w-36 flex-1 flex-col gap-0.5 bg-background px-4 py-2.5 transition-colors duration-base",
              current && "bg-muted/60"
            )}
          >
            <span
              className={cn(
                "font-mono text-[10px] tracking-[0.16em]",
                current ? "text-brand" : done ? "text-foreground/50" : "text-muted-foreground/50"
              )}
            >
              {stage.n}
            </span>
            <span
              className={cn(
                "text-xs tracking-tight",
                current ? "font-medium text-foreground" : done ? "text-foreground/60" : "text-muted-foreground/60"
              )}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
