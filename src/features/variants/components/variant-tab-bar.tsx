"use client";

import { cn } from "@/lib/utils";
import type { VariantDTO } from "@/features/variants/types";

export function flattenVariants(directions: VariantDTO[]): VariantDTO[] {
  return directions.flatMap((direction) => [direction, ...direction.refinements]);
}

export function VariantTabBar({
  variants,
  activeId,
  onSelect,
}: {
  variants: VariantDTO[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const flat = flattenVariants(variants);

  return (
    <div className="flex overflow-x-auto border-b border-border">
      {flat.map((variant) => (
        <button
          key={variant.id}
          onClick={() => onSelect(variant.id)}
          className={cn(
            "flex shrink-0 flex-col gap-0.5 border-b-2 border-transparent px-4 py-2.5 text-left transition-colors duration-fast",
            activeId === variant.id ? "border-brand" : "hover:bg-muted/50"
          )}
        >
          <span className={cn("text-xs font-semibold", activeId === variant.id ? "text-brand" : "text-foreground")}>
            {variant.label}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{variant.styleName}</span>
        </button>
      ))}
    </div>
  );
}
