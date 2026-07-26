"use client";

import { VariantFrame } from "@/features/variants/components/variant-frame";
import type { VariantDTO } from "@/features/variants/types";

export function VariantGrid({
  directions,
  onSelect,
}: {
  directions: VariantDTO[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-3">
      {directions.map((direction) => (
        <div key={direction.id} className="relative flex h-64 flex-col overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5">
            <span className="text-xs font-semibold text-foreground">{direction.label}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{direction.styleName}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <VariantFrame variant={direction} />
          </div>
          {/* Iframes are a separate browsing context and swallow clicks, so an
              overlay above it is what actually makes the whole card clickable. */}
          <button
            onClick={() => onSelect(direction.id)}
            aria-label={`Open ${direction.label}`}
            className="absolute inset-0 bg-transparent"
          />
        </div>
      ))}
    </div>
  );
}
